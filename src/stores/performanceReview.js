import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const usePerformanceReviewStore = defineStore("performanceReview", {
    state: () => ({
        reviews: [],
        myReviews: [],
        meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
        loading: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchReviews(params = {}) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get("/performance-reviews", { params });

                this.reviews = response.data.data?.data ?? [];
                this.meta = response.data.data?.meta ?? this.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchMyReviews() {
            try {
                const response = await axiosInstance.get("/my-performance-reviews");

                this.myReviews = response.data.data ?? [];
            } catch (error) {
                this.error = handleError(error);
            }
        },

        async createReview(payload) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.post("/performance-reviews", payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async acknowledgeReview(id) {
            try {
                const response = await axiosInstance.post(`/performance-reviews/${id}/acknowledge`);
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
