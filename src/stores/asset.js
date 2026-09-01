import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useAssetStore = defineStore("asset", {
    state: () => ({
        assets: [],
        myAssets: [],
        statistics: null,
        meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
        loading: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchAssets(params = {}) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get("/company-assets", { params });

                this.assets = response.data.data?.data ?? [];
                this.meta = response.data.data?.meta ?? this.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchStatistics() {
            try {
                const response = await axiosInstance.get("/company-assets/statistics");

                this.statistics = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            }
        },

        async fetchMyAssets() {
            try {
                const response = await axiosInstance.get("/my-assets");

                this.myAssets = response.data.data ?? [];
            } catch (error) {
                this.error = handleError(error);
            }
        },

        async fetchNextCode({ category, purchase_date } = {}) {
            const response = await axiosInstance.get("/company-assets/next-code", {
                params: { category, purchase_date: purchase_date || undefined },
            });

            return response.data.data.asset_code;
        },

        async createAsset(payload) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.post("/company-assets", payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async updateAsset(id, payload) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.put(`/company-assets/${id}`, payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async deleteAsset(id) {
            try {
                await axiosInstance.delete(`/company-assets/${id}`);
                this.assets = this.assets.filter((a) => a.id !== id);
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async assignAsset(id, payload) {
            try {
                const response = await axiosInstance.post(`/company-assets/${id}/assign`, payload);
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async returnAsset(id, payload = {}) {
            try {
                const response = await axiosInstance.post(`/company-assets/${id}/return`, payload);
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        /* ======================= MAINTENANCE LOGS ======================= */
        async fetchMaintenanceLogs(assetId) {
            try {
                const response = await axiosInstance.get(`/company-assets/${assetId}/maintenance-logs`);
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async createMaintenanceLog(payload) {
            this.loading = true;
            try {
                const response = await axiosInstance.post("/asset-maintenance-logs", payload);
                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async deleteMaintenanceLog(id) {
            try {
                await axiosInstance.delete(`/asset-maintenance-logs/${id}`);
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
