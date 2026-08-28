import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useProjectCashTransactionStore = defineStore("projectCashTransaction", {
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
    async fetchByProject(projectId) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/project-cash-transactions", {
          params: { project_id: projectId },
        });
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
        const { data } = await axiosInstance.post("/project-cash-transactions", payload);
        this.success = data.message;
        await this.fetchByProject(payload.project_id);
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.saving = false;
      }
    },

    async updateTransaction(id, projectId, payload) {
      this.saving = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.put(`/project-cash-transactions/${id}`, payload);
        this.success = data.message;
        await this.fetchByProject(projectId);
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.saving = false;
      }
    },

    async deleteTransaction(id, projectId) {
      this.error = null;
      try {
        const { data } = await axiosInstance.delete(`/project-cash-transactions/${id}`);
        this.success = data.message;
        await this.fetchByProject(projectId);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },
  },
});
