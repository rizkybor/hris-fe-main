import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useAttendanceSettingStore = defineStore("attendanceSetting", {
    state: () => ({
        setting: {
            allow_weekend_check_in: false,
            office_latitude: null,
            office_longitude: null,
            office_radius_meters: null,
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
                const { data } = await axiosInstance.get("/attendance-setting");
                this.setting = data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        // Accepts a partial payload (e.g. { allow_weekend_check_in } or
        // { office_latitude, office_longitude, office_radius_meters }) --
        // the backend only requires allow_weekend_check_in, the geofence
        // fields are all optional/independent of it.
        async updateSetting(payload) {
            this.error = null;
            try {
                const { data } = await axiosInstance.put("/attendance-setting", {
                    allow_weekend_check_in: this.setting.allow_weekend_check_in,
                    ...payload,
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
