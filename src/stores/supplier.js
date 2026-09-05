import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

// Deliberately minimal -- backs only the Company Asset "supplier" picker
// (who did we buy this from), not a managed module of its own. See
// hris-api-main's app/Models/Supplier.php for why this isn't Client.
export const useSupplierStore = defineStore("supplier", {
  state: () => ({
    suppliers: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchAllSuppliers() {
      this.loading = true;
      this.error = null;

      try {
        const response = await axiosInstance.get("suppliers");
        this.suppliers = response.data.data ?? [];
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createSupplier(payload) {
      try {
        const response = await axiosInstance.post("suppliers", payload);
        const supplier = response.data.data;
        this.suppliers.push(supplier);
        return supplier;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteSupplier(id) {
      try {
        await axiosInstance.delete(`suppliers/${id}`);
        this.suppliers = this.suppliers.filter((s) => s.id !== id);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },
  },
});
