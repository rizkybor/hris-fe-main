import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useConfigurableOptionStore = defineStore("configurableOption", {
    state: () => ({
        options: [],
        loading: false,
        error: null,
    }),

    actions: {
        async fetchByCategory(category) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get("/configurable-options", { params: { category } });
                this.options = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async createOption(payload) {
            try {
                const response = await axiosInstance.post("/configurable-options", payload);
                this.options = [...this.options, response.data.data];
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async updateOption(id, payload) {
            try {
                const response = await axiosInstance.put(`/configurable-options/${id}`, payload);
                this.options = this.options.map((option) =>
                    option.id === id ? response.data.data : option
                );
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async deleteOption(id) {
            try {
                await axiosInstance.delete(`/configurable-options/${id}`);
                this.options = this.options.filter((option) => option.id !== id);
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
