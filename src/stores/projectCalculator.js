import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { invalidate } from "@/composables/useStaleFetch";

let listSeq = 0; // latest fetchCalculations call
const SETTINGS_MAX_AGE = 60_000;
const STATS_MAX_AGE = 30_000;

const isThisMonth = (date) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};
const SCENARIO_STAT = { feature: "total_feature", build: "total_build", landing_page: "total_landing_page" };

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
        // Params (JSON) the list above was fetched with; null before the first load.
        listKey: null,
        currentCalculation: null,
        // When each piece was last loaded (ms), so pages can reuse it.
        currentAt: 0,
        settingsAt: 0,
        statsAt: 0,
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
            // Skeleton only on the first load; later refreshes keep showing the values.
            this.loadingRateSetting = !this.rateSetting.id;
            try {
                const { data } = await axiosInstance.get("/project-calculator/rate-setting");
                this.rateSetting = data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loadingRateSetting = false;
            }
        },

        // Every Fixed Cost / SDM Resource / Infrastructure Tool the Team Rate
        // Setup can pick, regardless of its Operational Cost usage status.
        async fetchRateSettingOptions() {
            const { data } = await axiosInstance.get("/project-calculator/rate-setting/options");
            return data.data;
        },

        async updateRateSetting(payload) {
            this.saving = true;
            this.error = null;
            try {
                const { data } = await axiosInstance.post("/project-calculator/rate-setting", {
                    ...payload,
                    _method: "PUT",
                });
                this.rateSetting = data.data;
                this.settingsAt = Date.now();
                this.success = data.message;
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.saving = false;
            }
        },

        // Both rate setups, unless loaded within maxAge (the dashboard just
        // showed them, so opening the form reuses them).
        async ensureRateSettings({ maxAge = SETTINGS_MAX_AGE } = {}) {
            if (this.rateSetting.id && this.landingPageRateSetting.id && Date.now() - this.settingsAt < maxAge) return;
            await Promise.all([this.fetchRateSetting(), this.fetchLandingPageRateSetting()]);
            this.settingsAt = Date.now();
        },

        async fetchLandingPageRateSetting() {
            this.loadingLandingPageRateSetting = !this.landingPageRateSetting.id;
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
                this.settingsAt = Date.now();
                this.success = data.message;
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.saving = false;
            }
        },

        async fetchStatistics({ maxAge = 0 } = {}) {
            if (this.statsAt && Date.now() - this.statsAt < maxAge) return;
            this.loadingStatistics = !this.statsAt;
            try {
                const { data } = await axiosInstance.get("/project-calculations/statistics");
                this.statistics = data.data;
                this.statsAt = Date.now();
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loadingStatistics = false;
            }
        },

        async fetchCalculations(params = {}) {
            // Only the latest request writes the list (search and filters can
            // change while an older request is still in flight).
            const seq = ++listSeq;
            this.loading = true;
            try {
                const { data } = await axiosInstance.get("/project-calculations", { params });
                if (seq !== listSeq) return;
                this.calculations = data.data.data;
                this.meta = data.data.meta;
                this.listKey = JSON.stringify(params);
            } catch (error) {
                if (seq === listSeq) this.error = handleError(error);
            } finally {
                if (seq === listSeq) this.loading = false;
            }
        },

        // An estimate the store already holds (just opened, saved or listed),
        // or null. List rows are the same full record the detail endpoint returns.
        cachedCalculation(id) {
            const key = String(id);
            if (this.currentCalculation && String(this.currentCalculation.id) === key) return this.currentCalculation;
            return this.calculations.find((c) => String(c.id) === key) ?? null;
        },

        // One estimate. With maxAge, the one opened/saved within that time is
        // reused without a request. Doesn't touch the list's loading flag.
        async fetchCalculation(id, { maxAge = 0 } = {}) {
            const current = this.currentCalculation;
            if (maxAge && current && String(current.id) === String(id) && Date.now() - this.currentAt < maxAge) return current;
            try {
                const { data } = await axiosInstance.get(`/project-calculations/${id}`);
                this.currentCalculation = data.data;
                this.currentAt = Date.now();
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        applyStats(record, sign) {
            const s = { ...this.statistics };
            s.total_calculations = Math.max(0, s.total_calculations + sign);
            s.total_value = Math.max(0, Number(s.total_value) + sign * Number(record.grand_total || 0));
            const field = SCENARIO_STAT[record.scenario];
            if (field) s[field] = Math.max(0, s[field] + sign);
            if (isThisMonth(record.created_at)) s.this_month = Math.max(0, s.this_month + sign);
            s.average_value = s.total_calculations ? s.total_value / s.total_calculations : 0;
            this.statistics = s;
        },

        patchSaved(saved, { previous = null, isNew = false } = {}) {
            this.currentCalculation = saved;
            this.currentAt = Date.now();
            if (this.statsAt) {
                if (isNew || previous) {
                    if (previous) this.applyStats(previous, -1);
                    this.applyStats(saved, +1);
                } else {
                    this.statsAt = 1; // unknown old values: refresh quietly next time
                }
            }
            const index = this.calculations.findIndex((c) => c.id === saved.id);
            if (index !== -1) {
                // Still matches the list's scenario filter? Otherwise refresh that list.
                const params = this.listKey ? JSON.parse(this.listKey) : {};
                if (params.scenario && params.scenario !== saved.scenario) invalidate("calc-list");
                this.calculations.splice(index, 1, saved);
                return;
            }
            if (!isNew) return;
            // A new estimate: newest first, so it tops the unfiltered first page.
            const params = this.listKey ? JSON.parse(this.listKey) : null;
            if (params && !params.search && !params.scenario && (params.page ?? 1) === 1) {
                this.calculations = [saved, ...this.calculations].slice(0, this.meta.per_page || 10);
                this.meta = { ...this.meta, total: this.meta.total + 1, last_page: Math.max(1, Math.ceil((this.meta.total + 1) / (this.meta.per_page || 10))) };
            } else {
                invalidate("calc-list");
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
                this.patchSaved(data.data, { isNew: true });
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
                const previous = this.cachedCalculation(id);
                const { data } = await axiosInstance.post(`/project-calculations/${id}`, {
                    ...payload,
                    _method: "PUT",
                });
                this.success = data.message;
                this.patchSaved(data.data, { previous });
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
                const record = this.cachedCalculation(id);
                await axiosInstance.delete(`/project-calculations/${id}`);
                const before = this.calculations.length;
                this.calculations = this.calculations.filter((c) => c.id !== id);
                if (this.calculations.length < before) this.meta = { ...this.meta, total: Math.max(0, this.meta.total - 1) };
                if (record && this.statsAt) this.applyStats(record, -1);
                if (String(this.currentCalculation?.id) === String(id)) this.currentCalculation = null;
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
