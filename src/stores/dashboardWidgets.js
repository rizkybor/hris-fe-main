import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

// Debounces rapid consecutive drags into a single request instead of one
// PUT per drop -- a user reordering several widgets in quick succession
// would otherwise fire overlapping requests that can race and leave the
// saved order inconsistent with what's on screen.
let saveTimer = null;

export const useDashboardWidgetsStore = defineStore("dashboardWidgets", {
  state: () => ({
    widgets: [], // [{ key, position }], already filtered to what the current user has permission for, in their saved order
    loading: false,
    saving: false,
    // "idle" | "saving" | "saved" | "error" -- drives the small save-status
    // indicator so the user gets confidence their reorder actually persisted
    // (or a clear signal when it didn't), without a blocking dialog for
    // what's otherwise a silent auto-save action.
    saveStatus: "idle",
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

    queueSaveOrder(order) {
      this.saveStatus = "saving";
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => this.saveOrder(order), 400);
    },

    async saveOrder(order) {
      this.saving = true;
      this.error = null;
      try {
        await axiosInstance.put("/dashboard/widgets/order", { order });
        this.saveStatus = "saved";
      } catch (error) {
        this.error = handleError(error);
        this.saveStatus = "error";
      } finally {
        this.saving = false;
      }
    },

    async resetOrder() {
      this.saving = true;
      this.error = null;
      try {
        await axiosInstance.delete("/dashboard/widgets/order");
        await this.fetchWidgets();
        this.saveStatus = "saved";
      } catch (error) {
        this.error = handleError(error);
        this.saveStatus = "error";
      } finally {
        this.saving = false;
      }
    },
  },
});
