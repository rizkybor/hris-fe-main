import { defineStore } from "pinia";
import { axiosInstance } from '@/plugins/axios';
import { handleError } from "@/helpers/errorHelper";

const PENDING_KEY = "hris-payroll-generations";
const PENDING_MAX_AGE = 15 * 60 * 1000; // job timeout is 10 min
const readPending = () => {
    try {
        return JSON.parse(sessionStorage.getItem(PENDING_KEY) || "[]").filter((g) => Date.now() - g.startedAt < PENDING_MAX_AGE);
    } catch {
        return [];
    }
};
const writePending = (list) => {
    try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(list));
    } catch {
        /* storage unavailable: tracking lasts for this page only */
    }
};
let listRequest = 0;

export const usePayrollStore = defineStore("payroll", {
    state: () => ({
        payrolls: [],
        payslips: [],
        statistics: {
            total_payroll: 0,
            pending_review: 0,
            finalized: 0,
            total_amount: 0,
            average_salary: 0,
            deductions: 0,
        },
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0
        },
        // The admin payroll list's own meta/flag: `meta` is shared with My
        // Payslips and the detail page's employee list.
        payrollsMeta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
        payrollsLoaded: false,
        statisticsLoaded: false,
        // Queued generations started here: [{ key, type, month: "YYYY-MM", id, baseline, startedAt }]
        pendingGenerations: readPending(),
        loading: false,
        loadingStatistics: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchPayrolls(params) {
            this.loading = true;
            const id = ++listRequest;

            try {
                const response = await axiosInstance.get('/payrolls/all/paginated', { params });

                // An older request (previous page/search) must not overwrite a newer one.
                if (id !== listRequest) return;
                // Fallbacks keep the list (and the polling check on it) safe
                // when the response has no rows.
                this.payrolls = response.data?.data?.data ?? [];
                this.meta = response.data?.data?.meta ?? this.meta;
                this.payrollsMeta = response.data?.data?.meta ?? this.payrollsMeta;
                this.payrollsLoaded = true;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                if (id === listRequest) this.loading = false;
            }
        },

        // Merge fields into a payroll row of the list (e.g. after mark-as-paid).
        patchPayroll(id, fields) {
            const row = this.payrolls.find((p) => String(p.id) === String(id));
            if (row) Object.assign(row, fields);
        },

        trackGeneration({ type, month, id = null, baseline = null }) {
            const key = `${type}:${month}`;
            this.pendingGenerations = [
                ...this.pendingGenerations.filter((g) => g.key !== key),
                { key, type, month, id, baseline, startedAt: Date.now() },
            ];
            writePending(this.pendingGenerations);
        },

        isGenerating(payroll) {
            if (!payroll) return false;
            if (payroll.status === "processing") return true;
            const month = String(payroll.salary_month || payroll.period || "").slice(0, 7);
            return this.pendingGenerations.some((g) => (g.id && String(g.id) === String(payroll.id)) || (g.type === (payroll.type || "monthly") && g.month === month));
        },

        // One quiet check per tracked generation. Resolves to the finished
        // ones ({ type, month, id, payroll? }) and to the ones given up on.
        async checkGenerations() {
            const finished = [];
            const expired = [];
            const still = [];
            await Promise.all(this.pendingGenerations.map(async (g) => {
                if (Date.now() - g.startedAt > PENDING_MAX_AGE) {
                    expired.push(g);
                    return;
                }
                try {
                    if (g.id) {
                        const response = await axiosInstance.get(`/payrolls/${g.id}`);
                        const p = response.data.data;
                        const replaced = g.baseline
                            ? p.updated_at !== g.baseline
                            : Date.parse(p.updated_at) > g.startedAt; // no baseline: newer than the click
                        if (p.status !== "processing" && replaced) finished.push({ ...g, payroll: p });
                        else still.push(g);
                    } else {
                        const response = await axiosInstance.get('/payrolls/check-period', { params: { salary_month: g.month, type: g.type } });
                        const c = response.data.data;
                        if (c.exists && c.status !== "processing") finished.push({ ...g, id: c.id });
                        else still.push(g);
                    }
                } catch {
                    still.push(g); // try again on the next tick
                }
            }));
            // Keep generations tracked meanwhile (started while this ran).
            const done = new Set([...finished, ...expired].map((g) => g.key));
            this.pendingGenerations = this.pendingGenerations.filter((g) => !done.has(g.key));
            writePending(this.pendingGenerations);
            return { finished, expired };
        },

        async fetchPayroll(id) {
            this.loading = true;

            try {
                const response = await axiosInstance.get(`/payrolls/${id}`);

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchPayrollDetails(id, page = 1, perPage = 50, params = {}) {
            try {
                const response = await axiosInstance.get(`/payrolls/${id}/details`, {
                    params: {
                        page,
                        per_page: perPage,
                        ...params
                    }
                });

                this.meta = response.data.data.meta;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async fetchPayrollPositions(id) {
            try {
                const response = await axiosInstance.get(`/payrolls/${id}/positions`);

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        // Lets the Generate form show a confirm dialog first, saying whether
        // this period is brand-new or already has data that would be replaced.
        async checkPeriod(salaryMonth, type) {
            try {
                const response = await axiosInstance.get('/payrolls/check-period', {
                    params: { salary_month: salaryMonth, type },
                });
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async generatePayroll(payload) {
            this.loading = true;

            try {
                const response = await axiosInstance.post('/payrolls/generate', payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        // THR (Tunjangan Hari Raya) is a separate payroll run from the
        // regular monthly one, based on tenure rather than attendance.
        async generateThrPayroll(payload) {
            this.loading = true;

            try {
                const response = await axiosInstance.post('/payrolls/generate-thr', payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async updatePayrollDetail(id, payload) {
            this.loading = true;

            try {
                const response = await axiosInstance.put(`/payroll-details/${id}`, payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        // Superadmin/Manager/Finance only -- see PayrollController::destroyDetail().
        async deletePayrollDetail(id) {
            this.loading = true;

            try {
                const response = await axiosInstance.delete(`/payroll-details/${id}`);

                this.success = response.data.message;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async markAsPaid(id, payload) {
            this.loading = true;

            try {
                const response = await axiosInstance.post(`/payrolls/${id}/mark-as-paid`, payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async deletePayroll(id) {
            this.loading = true;

            try {
                const response = await axiosInstance.delete(`/payrolls/${id}`);

                this.success = response.data.message;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchMyPayslips(params) {
            this.loading = true;

            try {
                const response = await axiosInstance.get('/my-payslips', { params });

                this.payslips = response.data.data.data;
                this.meta = response.data.data.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchMyPayslip(id) {
            this.loading = true;

            try {
                const response = await axiosInstance.get(`/my-payslips/${id}`);

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async downloadPayslip(id) {
            this.loading = true;

            try {
                const response = await axiosInstance.get(`/payslips/${id}/download`, {
                    responseType: 'blob'
                });

                return response.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchStatistics() {
            this.loadingStatistics = true;

            try {
                const response = await axiosInstance.get('/payrolls/statistics');

                this.statistics = response.data.data;
                this.statisticsLoaded = true;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loadingStatistics = false;
            }
        },

        async fetchPayrollStatistics(id) {
            try {
                const response = await axiosInstance.get(`/payrolls/${id}/statistics`);

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async exportExcel(id) {
            this.loading = true;

            try {
                const response = await axiosInstance.get(`/payrolls/${id}/export-excel`, {
                    responseType: 'blob'
                });

                // Create blob link to download
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;

                // Get filename from response headers or use default
                const contentDisposition = response.headers['content-disposition'];
                let filename = 'Payroll_Export.xlsx';
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch && filenameMatch.length === 2) {
                        filename = filenameMatch[1];
                    }
                }

                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);

                this.success = 'Excel file downloaded successfully';
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        clearMessages() {
            this.success = null;
            this.error = null;
        },
    }
})
