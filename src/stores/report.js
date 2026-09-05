import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useReportStore = defineStore("report", {
  state: () => ({
    attendance: { period: null, summary: {}, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    payroll: { period: null, summary: {}, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    employee: { summary: {}, rows: [] },
    finance: { period: null, summary: {}, rows: {} },
    pph21: { period: null, summary: {}, rows: [] },
    ppn: { period: null, summary: {}, rows: [] },
    project: { period: null, summary: {}, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    pph23: { period: null, summary: {}, rows: [] },
    subscription: { summary: {}, status_breakdown: [], upcoming_renewals: [], rows: [] },
    projectExpense: { period: null, summary: {}, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    staffRaport: { period: null, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    staffRaportDetail: null,
    loading: false,
    exporting: false,
    downloadingPdf: false,
    error: null,
  }),

  actions: {
    async fetchAttendanceReport(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/attendance", { params });
        this.attendance = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchPayrollReport(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/payroll", { params });
        this.payroll = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchEmployeeReport(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/employee", { params });
        this.employee = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchFinanceReport(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/finance", { params });
        this.finance = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchPph21Report(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/pph21", { params });
        this.pph21 = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchPpnReport(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/ppn", { params });
        this.ppn = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchProjectReport(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/project", { params });
        this.project = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchPph23Report(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/pph23", { params });
        this.pph23 = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchSubscriptionReport(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/subscription", { params });
        this.subscription = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchProjectExpenseReport(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/project-expense", { params });
        this.projectExpense = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchStaffRaport(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/reports/staff-raport", { params });
        this.staffRaport = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchStaffRaportDetail(employeeId, params = {}) {
      this.error = null;
      try {
        const { data } = await axiosInstance.get(`/reports/staff-raport/${employeeId}`, { params });
        this.staffRaportDetail = data.data;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async downloadStaffRaportPdf(employeeId, period, employeeName = "staff") {
      this.downloadingPdf = true;
      this.error = null;
      try {
        const response = await axiosInstance.get(`/reports/staff-raport/${employeeId}/pdf`, {
          params: { period },
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${employeeName.replace(/\s+/g, "-")}-raport-${period}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.downloadingPdf = false;
      }
    },

    async exportReport(type, params = {}) {
      this.exporting = true;
      this.error = null;
      try {
        const response = await axiosInstance.get("/reports/export", {
          params: { type, ...params },
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;

        const contentDisposition = response.headers["content-disposition"];
        let filename = `Report_${type}.xlsx`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename=(.+)/);
          if (filenameMatch && filenameMatch.length === 2) {
            filename = filenameMatch[1].replace(/"/g, "").trim();
          }
        }

        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.exporting = false;
      }
    },
  },
});
