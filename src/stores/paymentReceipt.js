import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { invalidate } from "@/composables/useStaleFetch";
import { openBlobPdf } from "@/utils/pdfTab";

let listSeq = 0; // latest list request

export const usePaymentReceiptStore = defineStore("paymentReceipt", {
  state: () => ({
    receipts: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    // Params of the list currently held (null until the first load).
    listKey: null,
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchReceipts(params = {}) {
      // Only the latest request writes the list (search and filters can
      // change while an older request is still in flight).
      const seq = ++listSeq;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/payment-receipts", {
          params: { row_per_page: 10, ...params },
        });
        if (seq !== listSeq) return;
        this.receipts = data.data.data;
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

    // Puts the saved fields into the listed row (keeps relations the
    // response doesn't carry).
    patchRow(id, fields) {
      const row = this.receipts.find((r) => String(r.id) === String(id));
      if (row && fields) Object.assign(row, fields);
    },

    async fetchReceipt(id) {
      const { data } = await axiosInstance.get(`/payment-receipts/${id}`);
      return data.data;
    },

    async createReceipt(payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/payment-receipts", payload);
        this.success = data.message;
        // The new one belongs at the top; its invoice may now show it.
        invalidate("payment-receipts-list");
        invalidate("invoices-list");
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateReceipt(id, payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.put(`/payment-receipts/${id}`, payload);
        this.success = data.message;
        invalidate("invoices-list"); // the linked invoice may have changed
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async cancelReceipt(id) {
      const { data } = await axiosInstance.post(`/payment-receipts/${id}/cancel`);
      this.patchRow(id, data.data);
      invalidate("invoices-list");
    },

    async deleteReceipt(id) {
      await axiosInstance.delete(`/payment-receipts/${id}`);
      const before = this.receipts.length;
      this.receipts = this.receipts.filter((r) => r.id !== id);
      if (this.receipts.length < before) this.meta = { ...this.meta, total: Math.max(0, this.meta.total - 1) };
      // Other pages shift by one; the linked invoice loses this receipt.
      invalidate("payment-receipts-list");
      invalidate("invoices-list");
    },

    async downloadPdf(id, number) {
      const response = await axiosInstance.get(`/payment-receipts/${id}/export-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${(number || "receipt").replace(/\//g, "-")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },

    // Opens the PDF inline in a new tab (browser's own viewer). The API
    // route needs an auth header, so the tab is opened right away (part of
    // the click, so pop-up blockers allow it) and pointed at the PDF once
    // it arrives. Call it straight from the click handler, before any await.
    viewPdf(id, tab = window.open("", "_blank")) {
      return openBlobPdf(tab, () => axiosInstance.get(`/payment-receipts/${id}/export-pdf`, { responseType: "blob" }));
    },
  },
});
