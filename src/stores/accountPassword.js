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
     * GET ALL
     * ============================= */
    async fetchAccounts(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const { data } = await axiosInstance.get("/credential-accounts", {
          params,
        });

        if (Array.isArray(data.data)) {
          this.accounts = data.data;
          this.statistics.total_accounts = data.data.length;
        } else if (data.data?.data) {
          this.accounts = data.data.data;
          this.meta = data.data.meta ?? this.meta;
          this.statistics.total_accounts = data.data.meta?.total ?? 0;
        } else {
          this.accounts = [];
          this.statistics.total_accounts = 0;
        }
      } catch (e) {
        this.error = handleError(e);
      } finally {
        this.loading = false;
      }
    },

    /* =============================
     * GET BY ID
     * ============================= */
    async fetchAccount(id) {
      try {
        const { data } = await axiosInstance.get(`/credential-accounts/${id}`);
        this.currentAccount = data.data;
        return data.data;
      } catch (e) {
        this.error = handleError(e);
        throw e;
      }
    },

    /* =============================
     * CREATE
     * ============================= */
    async createAccount(payload) {
      this.error = null;

      try {
        const apiPayload = {
          label_password: payload.label_password,
          username_email: payload.username_email,
          password: payload.password,
          website: payload.website || null,
          notes: payload.notes || null,
        };

        const { data } = await axiosInstance.post(
          "/credential-accounts",
          apiPayload
        );

        // optional: push ke list
        this.accounts.unshift(data.data);

        return data.data;
      } catch (e) {
        this.error = handleError(e);
        throw e;
      }
    },

    /* =============================
     * UPDATE (🔥 FIXED)
     * ============================= */
    async updateAccount(id, payload) {
      this.error = null;

      try {
        const apiPayload = {
          label_password: payload.label_password,
          username_email: payload.username_email,
          website: payload.website ?? null,
          notes: payload.notes ?? null,
          ...(payload.password ? { password: payload.password } : {}),
        };

        await axiosInstance.put(`/credential-accounts/${id}`, apiPayload, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        // 🔥 fetch ulang supaya dapat data terbaru
        const updated = await this.fetchAccount(id);

        // 🔄 sinkronkan ke list
        const index = this.accounts.findIndex((a) => a.id === id);
        if (index !== -1) {
          this.accounts[index] = updated;
        }

        return updated;
      } catch (e) {
        this.error = handleError(e);
        throw e;
      }
    },
    

    /* =============================
     * DELETE
     * ============================= */
    async deleteAccount(id) {
      try {
        await axiosInstance.delete(`/credential-accounts/${id}`);
        this.accounts = this.accounts.filter((a) => a.id !== id);

        if (this.currentAccount?.id === id) {
          this.currentAccount = null;
        }
      } catch (e) {
        this.error = handleError(e);
        throw e;
      }
    },

    /* =============================
     * CLEAR
     * ============================= */
    clearState() {
      this.accounts = [];
      this.currentAccount = null;
      this.error = null;
      this.success = null;
    },
  },
});
