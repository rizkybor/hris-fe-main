import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const usePayrollSettingStore = defineStore("payrollSetting", {
    state: () => ({
        setting: {
            attendance_exempt_roles_enabled: false,
            updated_by: null,
            updated_at: null,
        },
        loading: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchSetting() {
            this.loading = true;
            this.error = null;
            try {
                const { data } = await axiosInstance.get("/payroll-setting");
                this.setting = data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async updateSetting(payload) {
            this.error = null;
            try {
                const { data } = await axiosInstance.put("/payroll-setting", payload);
                this.setting = data.data;
                this.success = data.message;
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
