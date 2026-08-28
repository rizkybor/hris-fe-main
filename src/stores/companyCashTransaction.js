import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useCompanyCashTransactionStore = defineStore("companyCashTransaction", {
  state: () => ({
    transactions: [],
    openingBalance: 0,
    totalDebit: 0,
    totalCredit: 0,
    closingBalance: 0,
    meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    lastParams: {},
    loading: false,
    saving: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchAll(params = {}) {
      this.loading = true;
      this.error = null;
      // Remembered so create/update/delete can refresh the same filtered
      // page the user is currently looking at, instead of silently
      // resetting them back to an unfiltered page 1.
      this.lastParams = params;
      try {
        const { data } = await axiosInstance.get("/company-cash-transactions", { params });
        this.transactions = data.data.items;
        this.openingBalance = data.data.opening_balance;
        this.totalDebit = data.data.total_debit;
        this.totalCredit = data.data.total_credit;
        this.closingBalance = data.data.closing_balance;
        this.meta = data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createTransaction(payload) {
      this.saving = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/company-cash-transactions", payload);
        this.success = data.message;
        await this.fetchAll(this.lastParams);
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.saving = false;
      }
    },

    async updateTransaction(id, payload) {
      this.saving = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.put(`/company-cash-transactions/${id}`, payload);
        this.success = data.message;
        await this.fetchAll(this.lastParams);
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.saving = false;
      }
    },

    async deleteTransaction(id) {
      this.error = null;
      try {
        const { data } = await axiosInstance.delete(`/company-cash-transactions/${id}`);
        this.success = data.message;
        await this.fetchAll(this.lastParams);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateOpeningBalance(openingBalance) {
      this.saving = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.put("/company-cash-book/opening-balance", {
          opening_balance: openingBalance,
        });
        this.success = data.message;
        await this.fetchAll(this.lastParams);
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.saving = false;
      }
    },
  },
});
