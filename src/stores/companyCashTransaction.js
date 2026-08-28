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
    loading: false,
    saving: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchAll() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/company-cash-transactions");
        this.transactions = data.data.items;
        this.openingBalance = data.data.opening_balance;
        this.totalDebit = data.data.total_debit;
        this.totalCredit = data.data.total_credit;
        this.closingBalance = data.data.closing_balance;
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
        await this.fetchAll();
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
        await this.fetchAll();
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
        await this.fetchAll();
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
        await this.fetchAll();
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
