import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useSdmFieldStore = defineStore("sdmField", {
    state: () => ({
        fields: [],
        loading: false,
        error: null,
    }),

    actions: {
        async fetchFields() {
            this.loading = true;
            try {
                const { data } = await axiosInstance.get("/sdm-fields");
                this.fields = data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async createField(payload) {
            const { data } = await axiosInstance.post("/sdm-fields", payload);
            this.fields.push(data.data);
            this.fields.sort((a, b) => a.name.localeCompare(b.name));
            return data.data;
        },

        async deleteField(id) {
            await axiosInstance.delete(`/sdm-fields/${id}`);
            this.fields = this.fields.filter((f) => f.id !== id);
        },
    },
});
