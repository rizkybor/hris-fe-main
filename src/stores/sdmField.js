import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

let fieldsRequest = null; // shared in-flight request for ensureFields()

export const useSdmFieldStore = defineStore("sdmField", {
    state: () => ({
        fields: [],
        loading: false,
        error: null,
    }),

    actions: {
        // Cached for the session: the SDM modal calls this when it opens.
        // createField/deleteField keep `fields` current, so no refetch needed.
        ensureFields() {
            if (this.fields.length) return Promise.resolve(this.fields);
            if (!fieldsRequest) fieldsRequest = this.fetchFields().finally(() => (fieldsRequest = null));
            return fieldsRequest;
        },

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
