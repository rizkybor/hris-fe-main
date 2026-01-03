import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useCompanyFinanceStore = defineStore("company-finance", {
  state: () => ({
    companyFinance: {
      fixed_cost: { items: [], summary: {} },
      sdm_resource: { items: [], summary: {} },
      infrastructure: { items: [], summary: {} },
      company_balance: "0.00",
    },
    statistics: {
      total_budget: 0,
      total_actual: 0,
      variance: 0,
    },
    loading: false,
    loadingStatistics: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchOperationalCost(params) {
      this.loading = true;

      try {
        const response = await axiosInstance.get(`company-finance`, { params });

        this.companyFinance = response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchOperationalCostPaginated(params) {
      this.loading = true;

      try {
        const response = await axiosInstance.get(
          "/company-finance/all/paginated",
          { params }
        );

        this.companyFinance = response.data.data.data;
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
        const response = await axiosInstance.get(`company-finance/${id}`);

        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchOperationalCost(id) {
      this.loading = true;

      try {
        const response = await axiosInstance.get(`company-finance/${id}`);

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
        const response = await axiosInstance.post("company-finance", payload);

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
        const response = await axiosInstance.post(`company-finance/${id}`, {
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

    async fetchStatistics() {
      this.loadingStatistics = true;
      this.error = null;

      try {
        const response = await axiosInstance.get("/company-finance/statistic");

        this.statistics = response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loadingStatistics = false;
      }
    },
  },
});
