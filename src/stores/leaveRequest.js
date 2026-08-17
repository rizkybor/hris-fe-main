import { defineStore } from "pinia";
import { axiosInstance } from '@/plugins/axios';
import { handleError } from "@/helpers/errorHelper";

export const useLeaveRequestStore = defineStore("leaveRequest", {
    state: () => ({
        leaveRequests: [],
        myLeaveRequests: [],
        currentLeaveRequest: null,
        myLeaveBalance: null,
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0
        },
        loading: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchAllPaginated(params = {}) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('leave-requests/all/paginated', {
                    params: { row_per_page: 10, ...params },
                });

                this.leaveRequests = response.data.data.data;
                this.meta = response.data.data.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchMyLeaveRequests() {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('my-leave-requests');

                this.myLeaveRequests = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchMyLeaveBalance() {
            try {
                const response = await axiosInstance.get('leave-requests/balance/my');

                this.myLeaveBalance = response.data.data;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async fetchLeaveBalance(employeeId) {
            try {
                const response = await axiosInstance.get(`leave-requests/balance/${employeeId}`);

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async createLeaveRequest(payload) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.post('leave-requests', payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async getLeaveRequestById(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get(`leave-requests/${id}`);

                this.currentLeaveRequest = response.data.data;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchLatestLeaveRequests(limit = 5) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('leave-requests', {
                    params: { limit }
                });

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async approveLeaveRequest(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.post(`leave-requests/approve/${id}`);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async rejectLeaveRequest(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.post(`leave-requests/reject/${id}`);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
    }
})
