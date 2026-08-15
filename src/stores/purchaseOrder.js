import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const usePurchaseOrderStore = defineStore("purchaseOrder", {
  state: () => ({
    orders: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchOrders(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/purchase-orders", {
          params: { row_per_page: 10, ...params },
        });
        this.orders = data.data.data;
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

    async fetchOrder(id) {
      const { data } = await axiosInstance.get(`/purchase-orders/${id}`);
      return data.data;
    },

    async createOrder(payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/purchase-orders", payload);
        this.success = data.message;
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
      const idx = this.orders.findIndex((o) => o.id === id);
      if (idx !== -1) this.orders[idx] = data.data;
    },

    async deleteOrder(id) {
      await axiosInstance.delete(`/purchase-orders/${id}`);
      this.orders = this.orders.filter((o) => o.id !== id);
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
  },
});
