import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useReportStore = defineStore("report", {
  state: () => ({
    attendance: { period: null, summary: {}, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    payroll: { period: null, summary: {}, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    employee: { summary: {}, rows: [] },
    finance: { period: null, summary: {}, rows: {} },
    loading: false,
    exporting: false,
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
