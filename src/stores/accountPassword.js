import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useAccountPasswordStore = defineStore("accountPassword", {
  state: () => ({
    accounts: [],
    statistics: {
      total_accounts: 0,
      total_systems: 0,
      total_users: 0,
      last_updated: null,
    },
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 0,
    },
    loading: false,
    loadingStatistics: false,
    error: null,
    success: null,
  }),

  actions: {
    /* =============================
     * FETCH ACCOUNT PASSWORD LIST
     * ============================= */
    async fetchAccounts(params = {}) {
      this.loading = true;

      try {
        const response = await axiosInstance.get(
          "/account-passwords",
          { params }
        );

        // Expected API response:
        // data.data.data → list
        // data.data.meta → pagination
        this.accounts = response.data.data.data ?? [];
        this.meta = response.data.data.meta ?? this.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* =============================
     * FETCH SINGLE ACCOUNT
     * ============================= */
    async fetchAccount(id) {
      this.loading = true;

      try {
        const response = await axiosInstance.get(
          `/account-passwords/${id}`
        );

        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /* =============================
     * FETCH STATISTICS (OPTIONAL)
     * ============================= */
    async fetchStatistics() {
      this.loadingStatistics = true;

      try {
        const response = await axiosInstance.get(
          "/account-passwords/statistics"
        );

        this.statistics = response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loadingStatistics = false;
      }
    },

    /* =============================
     * COPY AUDIT (OPTIONAL / LOGGING)
     * ============================= */
    async logCopyAction(id) {
      try {
        await axiosInstance.post(
          `/account-passwords/${id}/log-copy`
        );
      } catch (error) {
        // sengaja tidak blocking UI
        console.warn("Failed to log copy action", error);
      }
    },

    /* =============================
     * CLEAR STATE
     * ============================= */
    clearState() {
      this.accounts = [];
      this.error = null;
      this.success = null;
    },
  },
});
