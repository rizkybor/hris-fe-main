import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useSubscriptionStore = defineStore("subscription", {
  state: () => ({
    subscriptions: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 },
    loading: false,
    generatingId: null,
    error: null,
    success: null,
  }),

  actions: {
    async fetchSubscriptions(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const response = await axiosInstance.get("subscriptions", { params: { row_per_page: 10, ...params } });
        this.subscriptions = response.data.data.data ?? [];
        this.meta = {
          current_page: response.data.data.current_page,
          last_page: response.data.data.last_page,
          per_page: response.data.data.per_page,
          total: response.data.data.total,
          from: response.data.data.from,
          to: response.data.data.to,
        };
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createSubscription(payload) {
      this.error = null;
      this.success = null;

      try {
        const response = await axiosInstance.post("subscriptions", payload);
        this.success = "Subscription created successfully";
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateSubscription(id, payload) {
      this.error = null;
      this.success = null;

      try {
        const response = await axiosInstance.put(`subscriptions/${id}`, payload);
        this.success = "Subscription updated successfully";
        const idx = this.subscriptions.findIndex((s) => s.id === id);
        if (idx !== -1) this.subscriptions[idx] = response.data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteSubscription(id) {
      this.error = null;
      this.success = null;

      try {
        await axiosInstance.delete(`subscriptions/${id}`);
        this.success = "Subscription deleted successfully";
        this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async generateInvoice(id) {
      this.error = null;
      this.success = null;
      this.generatingId = id;

      try {
        const response = await axiosInstance.post(`subscriptions/${id}/generate-invoice`);
        this.success = "Invoice generated successfully";
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.generatingId = null;
      }
    },
  },
});
