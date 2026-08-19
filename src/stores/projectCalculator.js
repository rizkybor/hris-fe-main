import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useProjectCalculatorStore = defineStore("projectCalculator", {
    state: () => ({
        rateSetting: {
            id: null,
            team_monthly_cost: 0,
            productive_hours_per_person: 0,
            team_size: 0,
            margin_multiplier: 0,
            pm_overhead_percent: 0,
            default_infra_setup_cost: 0,
            rate_cost_per_hour: 0,
            rate_sell_per_hour: 0,
            total_productive_hours_per_month: 0,
        },
        landingPageRateSetting: {
            id: null,
            server_dedicated_price: 0,
            server_shared_price: 0,
            design_dedicated_price: 0,
            design_template_price: 0,
        },
        calculations: [],
        currentCalculation: null,
        pphTypes: [],
        statistics: {
            total_calculations: 0,
            total_value: 0,
            average_value: 0,
            total_feature: 0,
            total_build: 0,
            total_landing_page: 0,
            this_month: 0,
        },
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0,
        },
        loading: false,
        loadingRateSetting: false,
        loadingLandingPageRateSetting: false,
        loadingStatistics: false,
        saving: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchRateSetting() {
            this.loadingRateSetting = true;
            try {
                const { data } = await axiosInstance.get("/project-calculator/rate-setting");
                this.rateSetting = data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loadingRateSetting = false;
            }
        },

        async updateRateSetting(payload) {
            this.saving = true;
            this.error = null;
            try {
                // PHP doesn't parse multipart bodies for a literal PUT request
                // (only POST), and this app's shared axios instance always
                // sends multipart/form-data -- so updates go through POST with
                // Laravel's _method spoofing instead, matching every other
                // store in this codebase.
                const { data } = await axiosInstance.post("/project-calculator/rate-setting", {
                    ...payload,
                    _method: "PUT",
                });
                this.rateSetting = data.data;
                this.success = data.message;
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.saving = false;
            }
        },

        async fetchLandingPageRateSetting() {
            this.loadingLandingPageRateSetting = true;
            try {
                const { data } = await axiosInstance.get("/project-calculator/landing-page-setting");
                this.landingPageRateSetting = data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loadingLandingPageRateSetting = false;
            }
        },

        async updateLandingPageRateSetting(payload) {
            this.saving = true;
            this.error = null;
            try {
                const { data } = await axiosInstance.post("/project-calculator/landing-page-setting", {
                    ...payload,
                    _method: "PUT",
                });
                this.landingPageRateSetting = data.data;
                this.success = data.message;
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.saving = false;
            }
        },

        async fetchPphTypes() {
            try {
                const { data } = await axiosInstance.get("/options/pph-types");
                this.pphTypes = data.data;
            } catch (error) {
                this.error = handleError(error);
            }
        },

        async fetchStatistics() {
            this.loadingStatistics = true;
            try {
                const { data } = await axiosInstance.get("/project-calculations/statistics");
                this.statistics = data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loadingStatistics = false;
            }
        },

        async fetchCalculations(params = {}) {
            this.loading = true;
            try {
                const { data } = await axiosInstance.get("/project-calculations", { params });
                this.calculations = data.data.data;
                this.meta = data.data.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchCalculation(id) {
            this.loading = true;
            try {
                const { data } = await axiosInstance.get(`/project-calculations/${id}`);
                this.currentCalculation = data.data;
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async preview(payload) {
            const { data } = await axiosInstance.post("/project-calculations/preview", payload);
            return data.data;
        },

        async createCalculation(payload) {
            this.saving = true;
            this.error = null;
            try {
                const { data } = await axiosInstance.post("/project-calculations", payload);
                this.success = data.message;
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.saving = false;
            }
        },

        async updateCalculation(id, payload) {
            this.saving = true;
            this.error = null;
            try {
                const { data } = await axiosInstance.post(`/project-calculations/${id}`, {
                    ...payload,
                    _method: "PUT",
                });
                this.success = data.message;
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.saving = false;
            }
        },

        async deleteCalculation(id) {
            try {
                await axiosInstance.delete(`/project-calculations/${id}`);
                this.calculations = this.calculations.filter((c) => c.id !== id);
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        clearMessages() {
            this.error = null;
            this.success = null;
        },
    },
});
