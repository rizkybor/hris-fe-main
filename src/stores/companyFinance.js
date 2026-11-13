import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

// Latest request id per list (fixedCostData / sdmResourceData / infraToolsData).
const listSeq = {};

export const useCompanyFinanceStore = defineStore("company-finance", {
  state: () => ({
    saldo: {
      company_balance: "0.00",
    },
    statistics: {
      fixed_cost: {
        summary: {
          total_actual: 0,
          total_items: 0,
        },
        items: [],
      },
      sdm_resource: {
        summary: {
          total_actual: 0,
        },
        items: [],
      },
      infrastructure: {
        summary: {
          total_monthly_fee: 0,
          total_annual_fee: 0,
          total_infra_active: 0,
        },
        items: [],
      },
      company_balance: "0.00",
      fixed_cost_byMonth: [],
      sdm_resource_byMonth: [],
      infrastructure_byMonth: [],
    },

    loading: false,
    loadingStatistics: false,
    // The last statistic request failed (the recap offers a retry).
    statisticsFailed: false,
    error: null,
    success: null,
    fixedCostData: {
      items: [],
      meta: {
        current_page: 1,
        per_page: 10,
        total: 1,
        last_page: 1,
      },
    },
    sdmResourceData: {
      items: [],
      meta: {
        current_page: 1,
        per_page: 10,
        total: 1,
        last_page: 1,
      },
    },
    infraToolsData: {
      items: [],
      meta: {
        current_page: 1,
        per_page: 10,
        total: 1,
        last_page: 1,
      },
    },
  }),

  actions: {
    async fetchOperationalCostPaginated(params) {
      this.loading = true;

      try {
        const response = await axiosInstance.get(
          "/company-finance/all/paginated",
          { params }
        );

        this.saldo.company_balance = response.data.data.data;
        this.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchOperationalCostById(id) {
      this.loading = true;

      try {
        const response = await axiosInstance.get(`company-finances/${id}`);

        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createOperationalCost(payload) {
      this.loading = true;

      try {
        const response = await axiosInstance.post("company-finances", payload);

        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateOperationalCost(id, payload) {
      this.loading = true;

      try {
        const response = await axiosInstance.post(`company-finances/${id}`, {
          ...payload,
          _method: "PUT",
        });

        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    // quiet: keep the figures on screen (no skeleton) while they refresh,
    // e.g. after a create/update/delete.
    async fetchStatistics({ quiet = false } = {}) {
      if (!quiet) this.loadingStatistics = true;
      this.error = null;

      try {
        const response = await axiosInstance.get("/company-finances/statistic");

        this.statistics = response.data.data;
        this.statisticsFailed = false;
      } catch (error) {
        this.statisticsFailed = true;
        this.error = handleError(error);
      } finally {
        this.loadingStatistics = false;
      }
    },

    // Shared by the three operational-cost lists. Only the latest request
    // per list may write its rows (a slow older response is dropped).
    async _fetchList(key, url, { page = 1, per_page = 10, search = "" } = {}) {
      const id = (listSeq[key] = (listSeq[key] ?? 0) + 1);
      this.loading = true;
      try {
        const response = await axiosInstance.get(url, {
          params: { page: page || 1, row_per_page: per_page || 10, search: search || "" },
        });
        if (id !== listSeq[key]) return;
        this[key].items = response.data.data.data;
        this[key].meta = response.data.data.meta;
      } catch (error) {
        if (id === listSeq[key]) this.error = handleError(error);
      } finally {
        if (id === listSeq[key]) this.loading = false;
      }
    },

    // Replace a row in place from the API response (keeps the page).
    patchRow(key, row) {
      if (!row?.id) return false;
      const index = this[key].items.findIndex((item) => item.id === row.id);
      if (index === -1) return false;
      this[key].items.splice(index, 1, { ...this[key].items[index], ...row });
      return true;
    },

    // Drop a deleted row and keep the pagination counts honest.
    removeRow(key, id) {
      const list = this[key];
      const before = list.items.length;
      list.items = list.items.filter((item) => item.id !== id);
      if (list.items.length === before || !list.meta) return;
      const total = Math.max(0, (Number(list.meta.total) || 0) - 1);
      const perPage = Number(list.meta.per_page) || 10;
      list.meta = {
        ...list.meta,
        total,
        last_page: Math.max(1, Math.ceil(total / perPage)),
        to: list.meta.to ? Math.max(0, list.meta.to - 1) : list.meta.to,
      };
    },

    async _mutate(request, after) {
      this.loading = true;
      try {
        const response = await request();
        this.success = response.data.message;
        after?.(response.data.data);
        this.fetchStatistics({ quiet: true });
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /* ================= FIXED COST ACTION METHODS ================= */
    fetchFixedCostPaginated(params = {}) {
      return this._fetchList("fixedCostData", "/fixed-costs/all/paginated", params);
    },

    // Create new the Fixed Cost. Resolves to the created record.
    createFixedCost(payload) {
      return this._mutate(() => axiosInstance.post("fixed-costs", payload));
    },

    // Edit update the Fixed Cost. Patches the row from the response.
    updateFixedCost(id, payload) {
      return this._mutate(
        () => axiosInstance.post(`fixed-costs/${id}`, { ...payload, _method: "PUT" }),
        (row) => this.patchRow("fixedCostData", row)
      );
    },

    // Delete the Fixed Cost
    async deleteFixedCost(id) {
      await this._mutate(
        () => axiosInstance.delete(`/fixed-costs/${id}`),
        () => this.removeRow("fixedCostData", id)
      );
      this.success = "Fixed Cost item deleted successfully";
    },

    /* ================= SDM RESOURCE ACTION METHODS ================= */
    fetchSdmResourcePaginated(params = {}) {
      return this._fetchList("sdmResourceData", "/sdm-resources/all/paginated", params);
    },

    createSdmResource(payload) {
      return this._mutate(() => axiosInstance.post("sdm-resources", payload));
    },

    updateSdmResource(id, payload) {
      return this._mutate(
        () => axiosInstance.post(`sdm-resources/${id}`, { ...payload, _method: "PUT" }),
        (row) => this.patchRow("sdmResourceData", row)
      );
    },

    async deleteSdmResource(id) {
      await this._mutate(
        () => axiosInstance.delete(`/sdm-resources/${id}`),
        () => this.removeRow("sdmResourceData", id)
      );
      this.success = "SDM Resource item deleted successfully";
    },

    /* ================= INFRA TOOLS ACTION METHODS ================= */
    fetchInfraToolsPaginated(params = {}) {
      return this._fetchList("infraToolsData", "/infrastructure-tools/all/paginated", params);
    },

    createInfraTools(payload) {
      return this._mutate(() => axiosInstance.post("infrastructure-tools", payload));
    },

    updateInfraTools(id, payload) {
      return this._mutate(
        () => axiosInstance.post(`infrastructure-tools/${id}`, { ...payload, _method: "PUT" }),
        (row) => this.patchRow("infraToolsData", row)
      );
    },

    async deleteInfraTools(id) {
      await this._mutate(
        () => axiosInstance.delete(`/infrastructure-tools/${id}`),
        () => this.removeRow("infraToolsData", id)
      );
      this.success = "Infrastructure item deleted successfully";
    },
  },
});
