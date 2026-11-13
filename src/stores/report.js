import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

// Latest request id per report key, plus the latest overall (for `loading`).
const requestSeq = { all: 0 };

export const useReportStore = defineStore("report", {
  state: () => ({
    attendance: { period: null, summary: {}, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    payroll: { period: null, summary: {}, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    employee: { summary: {}, rows: [] },
    finance: { source: null, period: null, summary: {}, rows: [], meta: null },
    pph21: { period: null, summary: {}, rows: [] },
    ppn: { period: null, summary: {}, rows: [] },
    project: { period: null, summary: {}, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    pph23: { period: null, summary: {}, rows: [] },
    subscription: { summary: {}, status_breakdown: [], upcoming_renewals: [], rows: [] },
    maintenance: { month: null, summary: {}, rows: [] },
    documents: null,
    staffRaport: { period: null, rows: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    staffRaportDetail: null,
    loading: false,
    exporting: false,
    downloadingPdf: false,
    error: null,
  }),

  actions: {
    async _load(key, url, params = {}) {
      const id = ++requestSeq.all;
      const own = (requestSeq[key] = id);
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get(url, { params });
        if (own !== requestSeq[key]) return false;
        this[key] = data.data;
        return true;
      } catch (error) {
        if (own === requestSeq[key]) this.error = handleError(error);
        return false;
      } finally {
        if (id === requestSeq.all) this.loading = false;
      }
    },

    applyCached(key, data) {
      requestSeq[key] = ++requestSeq.all;
      this[key] = data;
      this.loading = false;
    },

    fetchAttendanceReport(params = {}) {
      return this._load("attendance", "/reports/attendance", params);
    },

    fetchPayrollReport(params = {}) {
      return this._load("payroll", "/reports/payroll", params);
    },

    fetchEmployeeReport(params = {}) {
      return this._load("employee", "/reports/employee", params);
    },

    fetchFinanceReport(params = {}) {
      return this._load("finance", "/reports/finance", params);
    },

    fetchPph21Report(params = {}) {
      return this._load("pph21", "/reports/pph21", params);
    },

    fetchPpnReport(params = {}) {
      return this._load("ppn", "/reports/ppn", params);
    },

    fetchProjectReport(params = {}) {
      return this._load("project", "/reports/project", params);
    },

    fetchPph23Report(params = {}) {
      return this._load("pph23", "/reports/pph23", params);
    },

    fetchDocumentReport(params = {}) {
      return this._load("documents", "/reports/documents", params);
    },

    fetchMaintenanceReport(params = {}) {
      return this._load("maintenance", "/reports/maintenance", params);
    },

    fetchSubscriptionReport(params = {}) {
      return this._load("subscription", "/reports/subscription", params);
    },

    fetchStaffRaport(params = {}) {
      return this._load("staffRaport", "/reports/staff-raport", params);
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

    // periodParams: { period: "week" | "month" | "all" } or { start_date, end_date }.
    async downloadStaffRaportPdf(employeeId, periodParams, employeeName = "staff", withSignature = false) {
      this.downloadingPdf = true;
      this.error = null;
      try {
        const response = await axiosInstance.get(`/reports/staff-raport/${employeeId}/pdf`, {
          params: { ...periodParams, with_signature: withSignature ? 1 : 0 },
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = url;
        const suffix = periodParams.period || `${periodParams.start_date}_${periodParams.end_date}`;
        link.setAttribute("download", `${employeeName.replace(/\s+/g, "-")}-raport-${suffix}.pdf`);
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

    // Deletes the underlying real record (not just "removes it from the
    // report") -- gated server-side to Superadmin/Manager only.
    async deleteRow(type, id) {
      this.error = null;
      try {
        await axiosInstance.post("/reports/delete-row", { type, id });
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteByRange(type, startDate, endDate) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/reports/delete-range", {
          type,
          start_date: startDate,
          end_date: endDate,
        });
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
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
