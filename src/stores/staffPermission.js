import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useStaffPermissionStore = defineStore("staffPermission", {
    state: () => ({
        staffAccounts: [],
        currentStaff: null,
        loading: false,
        saving: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchStaffAccounts(search = "") {
            this.loading = true;
            this.error = null;
            try {
                const { data } = await axiosInstance.get("/staff-accounts", {
                    params: search ? { search } : {},
                });
                this.staffAccounts = data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchStaffPermissions(employeeId) {
            this.loading = true;
            this.error = null;
            this.currentStaff = null;
            try {
                const { data } = await axiosInstance.get(`/staff-accounts/${employeeId}/permissions`);
                this.currentStaff = data.data;
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async updateStaffPermissions(employeeId, permissions) {
            this.saving = true;
            this.error = null;
            this.success = null;
            try {
                const { data } = await axiosInstance.put(`/staff-accounts/${employeeId}/permissions`, {
                    permissions,
                });
                this.success = "Staff permissions updated successfully";
                return data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.saving = false;
            }
        },
    },
});
