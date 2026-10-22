import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

// Maintenance Management: client contracts with a monthly hour quota.
export const useMaintenanceStore = defineStore("maintenance", {
  state: () => ({
    contracts: [],
    contract: null,
    period: null,
    loading: false,
    detailLoading: false,
    periodLoading: false,
    error: null,
  }),

  actions: {
    async fetchContracts(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/maintenance/contracts", { params });
        this.contracts = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    // Panels on Client/Project detail fetch their own slice without
    // touching the list page's state.
    async fetchContractsFor(params) {
      const { data } = await axiosInstance.get("/maintenance/contracts", { params });
      return data.data;
    },

    async fetchContract(id, { silent = false } = {}) {
      if (!silent) this.detailLoading = true;
      try {
        const { data } = await axiosInstance.get(`/maintenance/contracts/${id}`);
        this.contract = data.data;
        return data.data;
      } finally {
        this.detailLoading = false;
      }
    },

    async fetchPeriod(id, { silent = false } = {}) {
      if (!silent) this.periodLoading = true;
      try {
        const { data } = await axiosInstance.get(`/maintenance/periods/${id}`);
        this.period = data.data;
        return data.data;
      } finally {
        this.periodLoading = false;
      }
    },

    async createContract(payload) {
      const { data } = await axiosInstance.post("/maintenance/contracts", payload);
      return data.data;
    },

    async updateContract(id, payload) {
      const { data } = await axiosInstance.put(`/maintenance/contracts/${id}`, payload);
      this.contract = data.data;
      return data.data;
    },

    async deleteContract(id) {
      await axiosInstance.delete(`/maintenance/contracts/${id}`);
      this.contracts = this.contracts.filter((c) => c.id !== id);
    },

    async share(id) {
      const { data } = await axiosInstance.post(`/maintenance/contracts/${id}/share`);
      return data.data.share_url;
    },

    async unshare(id) {
      await axiosInstance.delete(`/maintenance/contracts/${id}/share`);
    },

    async setLeftoverAction(periodId, leftoverAction) {
      await axiosInstance.put(`/maintenance/periods/${periodId}/leftover-action`, { leftover_action: leftoverAction });
    },

    async addAdjustment(periodId, payload) {
      await axiosInstance.post(`/maintenance/periods/${periodId}/adjustments`, payload);
    },

    async deleteAdjustment(id) {
      await axiosInstance.delete(`/maintenance/adjustments/${id}`);
    },

    async adjustBalance(contractId, payload) {
      await axiosInstance.post(`/maintenance/contracts/${contractId}/balance-adjustments`, payload);
    },

    async saveLog(contractId, payload, id = null) {
      if (id) return (await axiosInstance.put(`/maintenance/logs/${id}`, payload)).data.data;
      return (await axiosInstance.post(`/maintenance/contracts/${contractId}/logs`, payload)).data.data;
    },

    async deleteLog(id) {
      await axiosInstance.delete(`/maintenance/logs/${id}`);
    },

    async saveFeature(contractId, payload, id = null) {
      if (id) return (await axiosInstance.put(`/maintenance/features/${id}`, payload)).data.data;
      return (await axiosInstance.post(`/maintenance/contracts/${contractId}/features`, payload)).data.data;
    },

    async featureAction(id, action) {
      if (action === "delete") return axiosInstance.delete(`/maintenance/features/${id}`);
      return axiosInstance.post(`/maintenance/features/${id}/${action}`);
    },
  },
});
