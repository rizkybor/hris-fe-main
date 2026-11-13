import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { invalidate } from "@/composables/useStaleFetch";
import { openBlobPdf } from "@/utils/pdfTab";

let listSeq = 0; // latest fetchInvoices call

export const useInvoiceStore = defineStore("invoice", {
  state: () => ({
    invoices: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    // Params of the list currently held (null until the first load).
    listKey: null,
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchInvoices(params = {}) {
      // Only the latest request writes the list (search and filters can
      // change while an older request is still in flight).
      const seq = ++listSeq;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/invoices", {
          params: { row_per_page: 10, ...params },
        });
        if (seq !== listSeq) return;
        this.invoices = data.data.data;
        this.meta = {
          current_page: data.data.current_page,
          last_page: data.data.last_page,
          per_page: data.data.per_page,
          total: data.data.total,
        };
        this.listKey = JSON.stringify(params);
      } catch (error) {
        if (seq === listSeq) this.error = handleError(error);
      } finally {
        if (seq === listSeq) this.loading = false;
      }
    },

    // Options for pickers (e.g. the payment receipt form): returned, never
    // written to `invoices`, so the Invoice list keeps its own page.
    async fetchInvoiceOptions(params = {}) {
      const { data } = await axiosInstance.get("/invoices", { params: { row_per_page: 100, ...params } });
      return data.data.data ?? [];
    },

    async fetchInvoice(id) {
      const { data } = await axiosInstance.get(`/invoices/${id}`);
      return data.data;
    },

    patchRow(id, fields) {
      const row = this.invoices.find((i) => String(i.id) === String(id));
      if (row && fields) Object.assign(row, fields);
    },

    async createInvoice(payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/invoices", payload);
        this.success = data.message;
        invalidate("invoices-list"); // the new one belongs at the top
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
      this.patchRow(id, data.data);
    },

    async cancelInvoice(id) {
      const { data } = await axiosInstance.post(`/invoices/${id}/cancel`);
      this.patchRow(id, data.data);
    },

    async deleteInvoice(id) {
      await axiosInstance.delete(`/invoices/${id}`);
      const before = this.invoices.length;
      this.invoices = this.invoices.filter((i) => i.id !== id);
      if (this.invoices.length < before) this.meta = { ...this.meta, total: Math.max(0, this.meta.total - 1) };
      // Other pages shift by one; receipts linked to it lose the link.
      invalidate("invoices-list");
      invalidate("payment-receipts-list");
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

    viewPdf(id, tab = window.open("", "_blank")) {
      return openBlobPdf(tab, () => axiosInstance.get(`/invoices/${id}/export-pdf`, { responseType: "blob" }));
    },
  },
});
