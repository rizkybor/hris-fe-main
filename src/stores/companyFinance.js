import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useCompanyFinanceStore = defineStore("company-finance", {
  state: () => ({
    saldo: {
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
        const response = await axiosInstance.get("/fixed-costs/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });

        // Menyimpan data yang diterima
        this.fixedCostData.items = response.data.data.data;
        this.fixedCostData.meta = response.data.data.meta;

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

    // Create new the Fixed Cost
    async createFixedCost(payload) {
      this.loading = true;

      try {
        const response = await axiosInstance.post("fixed-costs", payload);

        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    // Edit update the Fixed Cost
    async updateFixedCost(id, payload) {
      this.loading = true;

      try {
        const response = await axiosInstance.post(`fixed-costs/${id}`, {
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

    // Delete the Fixed Cost
    async deleteFixedCost(id) {
      this.loading = true;

      try {
        await axiosInstance.delete(`/fixed-costs/${id}`);

        // Hapus dari state lokal
        this.fixedCostData.items = this.fixedCostData.items.filter(
          (item) => item.id !== id
        );

        // Update summary
        this.updateFixedCostSummary();

        this.success = "Fixed Cost item deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ================= SDM RESOURCE ACTION METHODS ================= */
    async fetchSdmResourcePaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(
          "/sdm-resources/all/paginated",
          {
            params: {
              row_per_page: params.per_page || 10,
              search: params.search || "",
            },
          }
        );

        // Menyimpan data yang diterima
        this.sdmResourceData.items = response.data.data.data;
        this.sdmResourceData.meta = response.data.data.meta;

        this.updateSdmResourceSummary();
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    // Update the SDM Resource summary
    updateSdmResourceSummary() {
      // sesuai struktur JSON API
      const items = this.sdmResourceData.items;
      const totalBudget = items.reduce(
        (acc, item) => acc + Number(item.budget || 0),
        0
      );
      const totalActual = items.reduce(
        (acc, item) => acc + Number(item.actual || 0),
        0
      );
      const variance = totalBudget - totalActual;
      this.statistics.sdm_resource.summary = {
        total_budget: totalBudget,
        total_actual: totalActual,
        variance,
        total_items: items.length,
      };
    },

    // Create new the SDM Resources
    async createSdmResource(payload) {
      this.loading = true;

      try {
        const response = await axiosInstance.post("sdm-resources", payload);

        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    // Edit update the Sdm Resources
    async updateSdmResource(id, payload) {
      this.loading = true;

      try {
        const response = await axiosInstance.post(`sdm-resources/${id}`, {
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

    // Delete the Sdm Resources
    async deleteSdmResource(id) {
      this.loading = true;

      try {
        await axiosInstance.delete(`/sdm-resources/${id}`);

        this.sdmResourceData.items = this.sdmResourceData.items.filter(
          (item) => item.id !== id
        );

        // Update summary
        this.updateSdmResourceSummary();

        this.success = "SDM Resource item deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ================= INFRA TOOLS ACTION METHODS ================= */
    async fetchInfraToolsPaginated({
      page = 1,
      per_page = 10,
      search = "",
    } = {}) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(
          "/infrastructure-tools/all/paginated",
          {
            params: {
              page,
              row_per_page: per_page,
              search,
            },
          }
        );

        // Simpan data & meta
        this.infraToolsData.items = response.data.data.data;
        this.infraToolsData.meta = response.data.data.meta;

        // Optional: summary / stats
        this.updateInfraToolsSummary();
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    // Update the Infra Tools summary
    updateInfraToolsSummary() {
      const items = this.infraToolsData.items;
      const total_monthly_fee = items.reduce(
        (acc, item) => acc + Number(item.monthly_fee || 0),
        0
      );
      const total_annual_fee = items.reduce(
        (acc, item) => acc + Number(item.annual_fee || 0),
        0
      );
      const total_infra_active = items.filter(
        (item) => item.status === "active"
      ).length;
      this.statistics.infrastructure.summary = {
        total_monthly_fee,
        total_annual_fee,
        total_infra_active,
      };
    },

    // Create new the Infra Tools
    async createInfraTools(payload) {
      this.loading = true;

      try {
        const response = await axiosInstance.post(
          "infrastructure-tools",
          payload
        );

        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    // Edit update the Infra Tools
    async updateInfraTools(id, payload) {
      this.loading = true;

      try {
        const response = await axiosInstance.post(
          `infrastructurre-tools/${id}`,
          {
            ...payload,
            _method: "PUT",
          }
        );

        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    // Delete the Infra Tools
    async deleteInfraTools(id) {
      this.loading = true;

      try {
        await axiosInstance.delete(`/infrastructure-tools/${id}`);

        this.infraToolsData.items = this.infraToolsData.items.filter(
          (item) => item.id !== id
        );

        // Update summary
        this.updateInfraToolsSummary();

        this.success = "Infrastructure item deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },
  },
});
