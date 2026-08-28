import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useStaffTaskStore = defineStore("staffTask", {
    state: () => ({
        staffTasks: [],
        currentStaffTask: null,
        myStaffTasks: [],
        staffOptions: [],
        meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
        loading: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchStaffTasks(params = {}) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get("/staff-tasks", { params });

                this.staffTasks = response.data.data?.data ?? [];
                this.meta = response.data.data?.meta ?? this.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchStaffTask(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get(`/staff-tasks/${id}`);
                this.currentStaffTask = response.data.data;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async createStaffTask(payload) {
            this.error = null;

            try {
                const response = await axiosInstance.post("/staff-tasks", payload);
                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async updateStaffTask(id, payload) {
            this.error = null;

            try {
                const response = await axiosInstance.put(`/staff-tasks/${id}`, payload);
                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async deleteStaffTask(id) {
            try {
                await axiosInstance.delete(`/staff-tasks/${id}`);
                this.staffTasks = this.staffTasks.filter((t) => t.id !== id);
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async fetchStaffOptions() {
            try {
                const response = await axiosInstance.get("/staff-tasks/staff-options");
                this.staffOptions = response.data.data ?? [];
            } catch (error) {
                this.error = handleError(error);
            }
        },

        async fetchMyStaffTasks() {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get("/my-staff-tasks");
                this.myStaffTasks = response.data.data ?? [];
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async updateMyStatus(id, status) {
            try {
                const response = await axiosInstance.patch(`/staff-tasks/${id}/status`, { status });

                const task = this.myStaffTasks.find((t) => t.id === id);
                if (task) {
                    task.my_assignment = { ...task.my_assignment, ...response.data.data };
                }

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
