import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";

export const useBankAccountStore = defineStore("bankAccount", {
  state: () => ({
    bankAccounts: [],
  }),

  actions: {
    async fetchBankAccounts() {
      const { data } = await axiosInstance.get("/bank-accounts");
      this.bankAccounts = data.data;
    },

    async createBankAccount(payload) {
      const { data } = await axiosInstance.post("/bank-accounts", payload);
      this.bankAccounts.push(data.data);
      return data.data;
    },

    async deleteBankAccount(id) {
      await axiosInstance.delete(`/bank-accounts/${id}`);
      this.bankAccounts = this.bankAccounts.filter((a) => a.id !== id);
    },
  },
});
