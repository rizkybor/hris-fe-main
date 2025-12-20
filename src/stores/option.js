import { defineStore } from "pinia";
import { axiosInstance } from '@/plugins/axios';
import { handleError } from "@/helpers/errorHelper";

export const useOptionStore = defineStore("option", {
    state: () => ({
        departments: [],
        employmentTypes: [],
        jobStatuses: [],
        leaveTypes: [],
        workLocations: [],
        skillLevels: [],
        loading: false,
        error: null,
    }),

    actions: {
        async fetchDepartments() {
            this.loading = true;

            try {
                const response = await axiosInstance.get('/options/departments');
                this.departments = response.data.data;
                console.log('Departments loaded:', this.departments);
            } catch (error) {
                this.error = handleError(error);
                console.error('Failed to fetch departments:', error);
            } finally {
                this.loading = false;
            }
        },

        // options/employment-types
        async fetchEmploymentTypes() {
            this.loading = true;

            try {
                const response = await axiosInstance.get('/options/employment-types');
                this.employmentTypes = response.data.data;
            } catch (error) {
                this.error = handleError(error);
                console.error('Failed to fetch employment types:', error);
            } finally {
                this.loading = false;
            }
        },

        // options/job-statuses
        async fetchJobStatuses() {
            this.loading = true;

            try {
                const response = await axiosInstance.get('/options/job-statuses');
                this.jobStatuses = response.data.data;
            } catch (error) {
                this.error = handleError(error);
                console.error('Failed to fetch job statuses:', error);
            } finally {
                this.loading = false;
            }
        },

        // options/leave-types
        async fetchLeaveTypes() {
            this.loading = true;

            try {
                const response = await axiosInstance.get('/options/leave-types');
                this.leaveTypes = response.data.data;
            } catch (error) {
                this.error = handleError(error);
                console.error('Failed to fetch leave types:', error);
            } finally {
                this.loading = false;
            }
        },

        // options/work-locations
        async fetchWorkLocations() {
            this.loading = true;

            try {
                const response = await axiosInstance.get('/options/work-locations');
                this.workLocations = response.data.data;
            } catch (error) {
                this.error = handleError(error);
                console.error('Failed to fetch work locations:', error);
            } finally {
                this.loading = false;
            }
        },

        // options/skill-levels
        async fetchSkillLevels() {
            this.loading = true;

            try {
                const response = await axiosInstance.get('/options/skill-levels');
                this.skillLevels = response.data.data;
            } catch (error) {
                this.error = handleError(error);
                console.error('Failed to fetch skill levels:', error);
            } finally {
                this.loading = false;
            }
        }
    }
})
