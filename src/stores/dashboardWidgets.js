import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useDashboardWidgetsStore = defineStore("dashboardWidgets", {
  state: () => ({
    widgets: [], // [{ key, ... }], already filtered to what the current user has permission for
    loading: false,
    error: null,
  }),

  actions: {
    async fetchWidgets() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/dashboard/widgets");
        this.widgets = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },
  },
});
