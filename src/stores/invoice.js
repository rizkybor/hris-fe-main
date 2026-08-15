import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useInvoiceStore = defineStore("invoice", {
  state: () => ({
    invoices: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchInvoices(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/invoices", {
          params: { row_per_page: 10, ...params },
        });
        this.invoices = data.data.data;
        this.meta = {
          current_page: data.data.current_page,
          last_page: data.data.last_page,
          per_page: data.data.per_page,
          total: data.data.total,
        };
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchInvoice(id) {
      const { data } = await axiosInstance.get(`/invoices/${id}`);
      return data.data;
    },

    async createInvoice(payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/invoices", payload);
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateInvoice(id, payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.put(`/invoices/${id}`, payload);
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async markAsPaid(id) {
      const { data } = await axiosInstance.post(`/invoices/${id}/mark-as-paid`);
      const idx = this.invoices.findIndex((i) => i.id === id);
      if (idx !== -1) this.invoices[idx] = data.data;
    },

    async cancelInvoice(id) {
      const { data } = await axiosInstance.post(`/invoices/${id}/cancel`);
      const idx = this.invoices.findIndex((i) => i.id === id);
      if (idx !== -1) this.invoices[idx] = data.data;
    },

    async deleteInvoice(id) {
      await axiosInstance.delete(`/invoices/${id}`);
      this.invoices = this.invoices.filter((i) => i.id !== id);
    },

    async downloadPdf(id, number) {
      const response = await axiosInstance.get(`/invoices/${id}/export-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${(number || "invoice").replace(/\//g, "-")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  },
});
