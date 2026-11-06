import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useDocumentSettingStore = defineStore("documentSetting", {
    state: () => ({
        setting: { signatory_show_degree: true },
        loading: false,
        error: null,
    }),

    actions: {
        async fetchSetting() {
            this.loading = true;
            this.error = null;
            try {
                const { data } = await axiosInstance.get("/document-setting");
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
                const { data } = await axiosInstance.put("/document-setting", { ...this.setting, ...payload });
                this.setting = data.data;
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
