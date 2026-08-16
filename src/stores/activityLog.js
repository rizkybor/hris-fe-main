import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useActivityLogStore = defineStore("activityLog", {
    state: () => ({
        activities: [],
        categories: [],
        statistics: {
            total: 0,
            today: 0,
            this_week: 0,
            by_category: [],
        },
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 20,
            total: 0,
        },
        loading: false,
        loadingStatistics: false,
        error: null,
    }),

    actions: {
        async fetchActivities(params = {}) {
            this.loading = true;
            this.error = null;

            try {
                const { data } = await axiosInstance.get("/history", { params });
                this.activities = data.data.data;
                this.meta = data.data.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchCategories() {
            try {
                const { data } = await axiosInstance.get("/history/categories");
                this.categories = data.data;
            } catch (error) {
                this.error = handleError(error);
            }
        },

        async fetchStatistics() {
            this.loadingStatistics = true;

            try {
                const { data } = await axiosInstance.get("/history/statistics");
                this.statistics = data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loadingStatistics = false;
            }
        },
    },
});
