import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { toRequestBody } from "@/helpers/formDataHelper";

let fetchSeq = 0; // only the latest fetchAll may write the list

export const useCompanyCashTransactionStore = defineStore("companyCashTransaction", {
  state: () => ({
    transactions: [],
    openingBalance: 0,
    openingBalanceUpdatedAt: null,
    openingBalanceUpdatedBy: null,
    totalDebit: 0,
    totalCredit: 0,
    // Part of totalDebit (spending is recorded as Debit).
    totalSpending: 0,
    closingBalance: 0,
    // Spending per person (on behalf of) over the current filters.
    spendingByEmployee: [],
    // Employees a spending entry can be recorded on behalf of.
    employeeOptions: [],
    meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    lastParams: {},
    loading: false,
    // A quiet refetch (after a mutation): content stays, no skeleton.
    refreshing: false,
    saving: false,
    error: null,
    success: null,
  }),

  actions: {
    // quiet: set `refreshing` instead of `loading` (keeps the table on screen).
    async fetchAll(params = {}, { quiet = false } = {}) {
      const id = ++fetchSeq;
      if (quiet) this.refreshing = true;
      else this.loading = true;
      this.error = null;
      // Remembered so create/update/delete can refresh the same filtered
      // page the user is currently looking at, instead of silently
      // resetting them back to an unfiltered page 1.
      this.lastParams = params;
      try {
        const { data } = await axiosInstance.get("/company-cash-transactions", { params });
        if (id !== fetchSeq) return;
        this.transactions = data.data.items;
        this.openingBalance = data.data.opening_balance;
        this.openingBalanceUpdatedAt = data.data.opening_balance_updated_at ?? null;
        this.openingBalanceUpdatedBy = data.data.opening_balance_updated_by ?? null;
        this.totalDebit = data.data.total_debit;
        this.totalCredit = data.data.total_credit;
        this.totalSpending = data.data.total_spending ?? 0;
        this.closingBalance = data.data.closing_balance;
        this.spendingByEmployee = data.data.spending_by_employee ?? [];
        this.meta = data.data.meta;
      } catch (error) {
        if (id === fetchSeq) this.error = handleError(error);
      } finally {
        if (id === fetchSeq) {
          this.loading = false;
          this.refreshing = false;
        }
      }
    },

    async fetchEmployeeOptions() {
      try {
        const { data } = await axiosInstance.get("/company-cash-book/employee-options");
        this.employeeOptions = data.data;
      } catch (error) {
        this.error = handleError(error);
      }
    },

    async createTransaction(payload) {
      this.saving = true;
      this.error = null;
      try {
        // Multipart when a proof file is attached, plain JSON otherwise.
        const { data } = await axiosInstance.post("/company-cash-transactions", toRequestBody(payload));
        this.success = data.message;
        // Running balances are computed server-side: refetch, quietly.
        await this.fetchAll(this.lastParams, { quiet: true });
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
        // POST + _method so a proof file can go along (PHP doesn't parse
        // multipart bodies on a real PUT).
        const { data } = await axiosInstance.post(`/company-cash-transactions/${id}`, toRequestBody({ ...payload, _method: "PUT" }));
        this.success = data.message;
        // Running balances are computed server-side: refetch, quietly.
        await this.fetchAll(this.lastParams, { quiet: true });
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
        // Running balances are computed server-side: refetch, quietly.
        await this.fetchAll(this.lastParams, { quiet: true });
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
        // Running balances are computed server-side: refetch, quietly.
        await this.fetchAll(this.lastParams, { quiet: true });
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
