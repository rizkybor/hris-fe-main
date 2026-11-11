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

    // Returns the updated month (totals + leftover choice).
    async setLeftoverAction(periodId, leftoverAction) {
      const { data } = await axiosInstance.put(`/maintenance/periods/${periodId}/leftover-action`, { leftover_action: leftoverAction });
      if (data?.data?.id) this.patchPeriod(data.data);
      return data?.data;
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

    // ----- Patching the open detail from responses (no double reloads) -----

    // A month's totals changed: update it in the contract (periods list and
    // current month) and in the open month, keeping the open month's logs
    // and adjustments.
    patchPeriod(fields) {
      if (!fields?.id) return;
      const { logs, adjustments, ...totals } = fields; // eslint-disable-line no-unused-vars
      if (this.contract) {
        const idx = this.contract.periods?.findIndex((p) => p.id === fields.id) ?? -1;
        if (idx !== -1) this.contract.periods[idx] = { ...this.contract.periods[idx], ...totals };
        if (this.contract.current_period?.id === fields.id) this.contract.current_period = { ...this.contract.current_period, ...totals };
      }
      if (this.period?.id === fields.id) this.period = { ...this.period, ...totals };
    },

    // Re-read only the contract (balance, features, months' totals) and
    // carry the open month's totals over from it.
    async refreshContract(id) {
      const data = await this.fetchContract(id, { silent: true });
      const fresh = this.period && data.periods?.find((p) => p.id === this.period.id);
      if (fresh) this.period = { ...this.period, ...fresh };
      return data;
    },

    // Re-read only the open month (its logs/adjustments) and carry its
    // totals over to the contract.
    async refreshPeriod(id) {
      const data = await this.fetchPeriod(id, { silent: true });
      this.patchPeriod(data);
      return data;
    },

    // A saved work log of a month: put it in the open month's list.
    upsertPeriodLog(log) {
      if (!this.period?.logs) return;
      const logs = this.period.logs.filter((l) => l.id !== log.id);
      if (log.maintenance_period_id === this.period.id && !log.maintenance_feature_id) logs.push(log);
      logs.sort((a, b) => String(b.work_date).localeCompare(String(a.work_date)) || b.id - a.id);
      this.period = { ...this.period, logs };
    },

    removePeriodLog(id) {
      if (this.period?.logs) this.period = { ...this.period, logs: this.period.logs.filter((l) => l.id !== id) };
    },

    // A saved feature (the API returns it without its logs).
    upsertFeature(feature) {
      if (!this.contract?.features) return;
      const idx = this.contract.features.findIndex((f) => f.id === feature.id);
      if (idx === -1) {
        this.contract.features = [{ ...feature, logs: [] }, ...this.contract.features];
        if (["proposed", "approved", "in_progress"].includes(feature.status)) this.contract.open_features = (this.contract.open_features || 0) + 1;
      } else {
        this.contract.features[idx] = { ...this.contract.features[idx], ...feature };
      }
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
