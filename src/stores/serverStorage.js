import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { errorMessage } from "@/helpers/errorHelper";

export const useServerStorageStore = defineStore("serverStorage", {
  state: () => ({
    storage: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchStorage(refresh = false) {
      this.loading = true;
      this.error = null;

      try {
        const response = await axiosInstance.get("/server-storage", {
          params: refresh ? { refresh: 1 } : {},
        });

        this.storage = response.data.data;
      } catch (error) {
        this.error = errorMessage(error, "Failed to load server storage.");
      } finally {
        this.loading = false;
      }
    },
  },
});
