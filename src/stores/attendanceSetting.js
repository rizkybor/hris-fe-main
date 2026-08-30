import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useAttendanceSettingStore = defineStore("attendanceSetting", {
    state: () => ({
        setting: { allow_weekend_check_in: false, updated_by: null, updated_at: null },
        loading: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchSetting() {
            this.loading = true;
            this.error = null;
            try {
                const { data } = await axiosInstance.get("/attendance-setting");
                this.setting = data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async updateSetting(allowWeekendCheckIn) {
            this.error = null;
            try {
                const { data } = await axiosInstance.put("/attendance-setting", {
                    allow_weekend_check_in: allowWeekendCheckIn,
                });
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
