import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const usePaymentReceiptStore = defineStore("paymentReceipt", {
  state: () => ({
    receipts: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchReceipts(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/payment-receipts", {
          params: { row_per_page: 10, ...params },
        });
        this.receipts = data.data.data;
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

    async fetchReceipt(id) {
      const { data } = await axiosInstance.get(`/payment-receipts/${id}`);
      return data.data;
    },

    async createReceipt(payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/payment-receipts", payload);
        this.success = data.message;
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
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async cancelReceipt(id) {
      const { data } = await axiosInstance.post(`/payment-receipts/${id}/cancel`);
      const idx = this.receipts.findIndex((r) => r.id === id);
      if (idx !== -1) this.receipts[idx] = data.data;
    },

    async deleteReceipt(id) {
      await axiosInstance.delete(`/payment-receipts/${id}`);
      this.receipts = this.receipts.filter((r) => r.id !== id);
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

    // Opens the PDF inline in a new tab (browser's own viewer) instead of
    // forcing a save-as -- the API route needs an auth header, so this
    // can't just be a plain <a href> to the endpoint like a public file.
    async viewPdf(id) {
      const response = await axiosInstance.get(`/payment-receipts/${id}/export-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      window.open(url, "_blank");
    },
  },
});
