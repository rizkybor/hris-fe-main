import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useResignationStore = defineStore("resignation", {
    state: () => ({
        resignations: [],
        current: null,
        assetsToReturn: [],
        loading: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchResignations(params = {}) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get("/resignations", { params });

                this.resignations = response.data.data ?? [];
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchEmployeeResignation(employeeId) {
            try {
                const response = await axiosInstance.get(`/employees/${employeeId}/resignation`);

                this.current = response.data.data?.resignation ?? null;
                this.assetsToReturn = response.data.data?.assets_to_return ?? [];
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async initiateResignation(employeeId, payload) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.post(`/employees/${employeeId}/resignation`, payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async completeOffboarding(id, payload = {}) {
            try {
                const response = await axiosInstance.post(`/resignations/${id}/complete`, payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
