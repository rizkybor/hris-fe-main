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
      fixed_cost: {
        summary: {
          total_budget: 0,
          total_actual: 0,
          variance: 0,
          total_items: 0,
        },
        items: [],
      },
      sdm_resource: {
        summary: {
          total_budget: 0,
          total_actual: 0,
          variance: 0,
          total_status_green: 0,
          total_status_amber: 0,
          total_status_red: 0,
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
  }),

  actions: {
    async fetchOperationalCost(params) {
      this.loading = true;

      try {
        const response = await axiosInstance.get(`company-finances`, {
          params,
        });

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
        const response = await axiosInstance.get(`company-finances/${id}`);

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

    async fetchStatistics() {
      this.loadingStatistics = true;
      this.error = null;

      try {
        const response = await axiosInstance.get("/company-finances/statistic");

        this.statistics = response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loadingStatistics = false;
      }
    },

    /* ================= FIXED COST ACTION METHODS ================= */
    async fetchFixedCostPaginated(params) {
      this.loading = true;

      try {
        // Ubah URL untuk mencocokkan endpoint yang benar
        const response = await axiosInstance.get(
          "/fixed-costs/all/paginated", // URL endpoint yang benar
          {
            params: {
              row_per_page: params.per_page || 10, // Parameter untuk pagination
              search: params.search || "", // Parameter untuk search jika ada
            },
          }
        );

        // Menyimpan data yang diterima
        this.fixedCostData.items = response.data.data.data; // Menyimpan items
        this.fixedCostData.meta = response.data.data.meta; // Menyimpan meta

        // Memperbarui summary (jika ada fungsi ini)
        this.updateFixedCostSummary();
      } catch (error) {
        // Menangani error jika ada
        this.error = handleError(error);
      } finally {
        // Mengubah status loading menjadi false setelah request selesai
        this.loading = false;
      }
    },

    // Update the Fixed Cost summary
    updateFixedCostSummary() {
      const items = this.fixedCostData.items;
      const totalBudget = items.reduce((acc, item) => acc + item.budget, 0);
      const totalActual = items.reduce((acc, item) => acc + item.actual, 0);
      const variance = totalBudget - totalActual;

      this.statistics.fixed_cost.summary = {
        total_budget: totalBudget,
        total_actual: totalActual,
        variance: variance,
        total_items: items.length,
      };
    },
  },
});
