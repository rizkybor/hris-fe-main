import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useAccountPasswordStore = defineStore("accountPassword", {
  state: () => ({
    accounts: [],
    currentAccount: null,
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
     * GET ALL CREDENTIAL ACCOUNTS
     * GET /credential-accounts?search=GitHub&limit=10
     * ============================= */
    async fetchAccounts(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const response = await axiosInstance.get("/credential-accounts", {
          params,
        });

        // Handle different response structures
        if (Array.isArray(response.data.data)) {
          this.accounts = response.data.data;
        } else if (response.data.data?.data) {
          this.accounts = response.data.data.data;
          this.meta = response.data.data.meta ?? this.meta;
        } else {
          this.accounts = response.data.data ?? [];
        }
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* =============================
     * GET CREDENTIAL ACCOUNTS PAGINATED
     * GET /credential-accounts/all/paginated?row_per_page=10&search=
     * ============================= */
    async fetchAccountsPaginated(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const response = await axiosInstance.get(
          "/credential-accounts/all/paginated",
          { params }
        );

        // Expected API response structure
        if (response.data.data?.data) {
          this.accounts = response.data.data.data;
          this.meta = response.data.data.meta ?? this.meta;
        } else {
          this.accounts = response.data.data ?? [];
        }
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* =============================
     * GET CREDENTIAL ACCOUNT BY ID
     * GET /credential-accounts/1
     * ============================= */
    async fetchAccount(id) {
      this.loading = true;
      this.error = null;

      try {
        const response = await axiosInstance.get(`/credential-accounts/${id}`);
        this.currentAccount = response.data.data;
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /* =============================
     * CREATE CREDENTIAL ACCOUNT
     * POST /credential-accounts
     * ============================= */
    async createAccount(payload) {
      this.loading = true;
      this.error = null;
      this.success = null;

      try {
        // Map form fields to API fields
        const apiPayload = {
          label_password: payload.label_password || payload.label,
          username_email: payload.username_email || payload.username,
          password: payload.password,
          website: payload.website || null,
          notes: payload.notes || null,
        };

        const response = await axiosInstance.post(
          "/credential-accounts",
          apiPayload
        );

        this.success = "Credential account created successfully";
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /* =============================
     * UPDATE CREDENTIAL ACCOUNT
     * PUT /credential-accounts/1
     * ============================= */
    async updateAccount(id, payload) {
      this.loading = true;
      this.error = null;
      this.success = null;

      try {
        // Map form fields to API fields
        const apiPayload = {
          label_password: payload.label_password || payload.label,
          username_email: payload.username_email || payload.username,
          website: payload.website || null,
          notes: payload.notes || null,
        };

        // Only include password if provided
        if (payload.password) {
          apiPayload.password = payload.password;
        }

        const response = await axiosInstance.put(
          `/credential-accounts/${id}`,
          apiPayload
        );

        this.success = "Credential account updated successfully";
        this.currentAccount = response.data.data;
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /* =============================
     * DELETE CREDENTIAL ACCOUNT
     * DELETE /credential-accounts/1
     * ============================= */
    async deleteAccount(id) {
      this.loading = true;
      this.error = null;
      this.success = null;

      try {
        await axiosInstance.delete(`/credential-accounts/${id}`);
        this.success = "Credential account deleted successfully";

        // Remove from accounts list
        this.accounts = this.accounts.filter((account) => account.id !== id);
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
          "/credential-accounts/statistics"
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
        await axiosInstance.post(`/credential-accounts/${id}/log-copy`);
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
      this.currentAccount = null;
      this.error = null;
      this.success = null;
    },
  },
});
