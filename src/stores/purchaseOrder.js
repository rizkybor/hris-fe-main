import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { invalidate } from "@/composables/useStaleFetch";
import { openBlobPdf } from "@/utils/pdfTab";

let listSeq = 0; // latest list request

export const usePurchaseOrderStore = defineStore("purchaseOrder", {
  state: () => ({
    orders: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    // Params of the list currently held (null until the first load).
    listKey: null,
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchOrders(params = {}) {
      // Only the latest request writes the list (search and filters can
      // change while an older request is still in flight).
      const seq = ++listSeq;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/purchase-orders", {
          params: { row_per_page: 10, ...params },
        });
        if (seq !== listSeq) return;
        this.orders = data.data.data;
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
      const row = this.orders.find((r) => String(r.id) === String(id));
      if (row && fields) Object.assign(row, fields);
    },

    async fetchOrder(id) {
      const { data } = await axiosInstance.get(`/purchase-orders/${id}`);
      return data.data;
    },

    async createOrder(payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/purchase-orders", payload);
        this.success = data.message;
        // The new one belongs at the top.
        invalidate("purchase-orders-list");
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateOrder(id, payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.put(`/purchase-orders/${id}`, payload);
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async cancelOrder(id) {
      const { data } = await axiosInstance.post(`/purchase-orders/${id}/cancel`);
      this.patchRow(id, data.data);
    },

    async deleteOrder(id) {
      await axiosInstance.delete(`/purchase-orders/${id}`);
      const before = this.orders.length;
      this.orders = this.orders.filter((o) => o.id !== id);
      if (this.orders.length < before) this.meta = { ...this.meta, total: Math.max(0, this.meta.total - 1) };
      invalidate("purchase-orders-list"); // other pages shift by one
    },

    async downloadPdf(id, number) {
      const response = await axiosInstance.get(`/purchase-orders/${id}/export-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${(number || "purchase-order").replace(/\//g, "-")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },

    viewPdf(id, tab = window.open("", "_blank")) {
      return openBlobPdf(tab, () => axiosInstance.get(`/purchase-orders/${id}/export-pdf`, { responseType: "blob" }));
    },
  },
});
