import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

// The axios instance defaults Content-Type to multipart/form-data (see
// plugins/axios.js) for file-upload endpoints; a plain JSON body sent under
// that header can't be parsed by Laravel at all, so writes here must
// override it explicitly -- same fix as dashboardWidgets.js needed.
const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

export const useGreetingStore = defineStore("greeting", {
  state: () => ({
    greetings: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    todayGreetings: [],
    loading: false,
    loadingToday: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchGreetings(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/greetings", { params: { row_per_page: 10, ...params } });
        this.greetings = data.data.data;
        this.meta = data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchTodayGreetings() {
      this.loadingToday = true;
      try {
        const { data } = await axiosInstance.get("/greetings/today");
        this.todayGreetings = data.data;
      } catch {
        // Non-critical for the dashboard banner -- fail silently rather
        // than surfacing an error state for a decorative greeting strip.
        this.todayGreetings = [];
      } finally {
        this.loadingToday = false;
      }
    },

    async createGreeting(payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/greetings", payload, JSON_HEADERS);
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateGreeting(id, payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.put(`/greetings/${id}`, payload, JSON_HEADERS);
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteGreeting(id) {
      this.error = null;
      try {
        await axiosInstance.delete(`/greetings/${id}`);
        this.greetings = this.greetings.filter((g) => g.id !== id);
        this.meta.total = Math.max(0, this.meta.total - 1);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },
  },
});
