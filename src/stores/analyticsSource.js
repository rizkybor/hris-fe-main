import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useAnalyticsSourceStore = defineStore("analyticsSource", {
  state: () => ({
    // Array of { category, sources: [...] } -- already grouped server-side.
    categories: [],
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchSources(search = "") {
      this.loading = true;
      this.error = null;

      try {
        const response = await axiosInstance.get("analytics-sources", {
          params: { search: search || undefined },
        });
        this.categories = response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createSource(payload) {
      this.error = null;
      this.success = null;

      try {
        await axiosInstance.post("analytics-sources", payload);
        this.success = "Analytics source added successfully";
        await this.fetchSources();
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateSource(id, payload) {
      this.error = null;
      this.success = null;

      try {
        await axiosInstance.put(`analytics-sources/${id}`, payload);
        this.success = "Analytics source updated successfully";
        await this.fetchSources();
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteSource(id) {
      this.error = null;
      this.success = null;

      try {
        await axiosInstance.delete(`analytics-sources/${id}`);
        this.success = "Analytics source deleted successfully";
        await this.fetchSources();
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },
  },
});
