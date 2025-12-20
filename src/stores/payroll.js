import { defineStore } from "pinia";
import { axiosInstance } from '@/plugins/axios';
import { handleError } from "@/helpers/errorHelper";

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
        loading: false,
        loadingStatistics: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchPayrolls(params) {
            this.loading = true;

            try {
                const response = await axiosInstance.get('/payrolls/all/paginated', { params });

                this.payrolls = response.data.data.data;
                this.meta = response.data.data.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
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
    }
})
