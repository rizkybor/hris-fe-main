import { defineStore } from "pinia";
import { axiosInstance } from '@/plugins/axios';
import { handleError } from "@/helpers/errorHelper";

export const useEmployeeStore = defineStore("employee", {
    state: () => ({
        employees: [],
        latestEmployees: [],
        statistics: {
            total: 0,
            added_this_month: 0,
            active: 0,
            active_change: 0,
            on_leave: 0,
            on_leave_change: 0,
            average_salary: 0,
            new_employees: 0,
        },
        performanceStatistics: {
            tasks_completed: 0,
            attendance_rate: 0,
            projects_count: 0,
            performance_score: 0,
        },
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0
        },
        // Self-service pages (My Profile / My Team) keep their data here so a
        // revisit shows it at once and refreshes quietly. Separate from the
        // admin fields above (performanceStatistics is also used by
        // EmployeeDetail for other employees).
        myProfile: null,
        myPerformanceStatistics: null,
        myTeam: null,
        myTeamMembers: [],
        myTeamProjects: [],
        myTeamLoaded: false,
        // User id the cached My Team data belongs to (stores aren't reset on
        // logout, so pages check it before showing cached data).
        myTeamFor: null,
        loading: false,
        loadingLatest: false,
        loadingStatistics: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchEmployees(params) {
            this.loading = true

            try {
                const response = await axiosInstance.get(`employees`, { params })

                this.employees = response.data.data
            } catch (error) {
                this.error = handleError(error)
            } finally {
                this.loading = false
            }
        },

        async fetchEmployeesPaginated(params) {
            this.loading = true;

            try {
                const response = await axiosInstance.get('/employees/all/paginated', { params });

                this.employees = response.data.data.data;
                this.meta = response.data.data.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchEmployee(id) {
            this.loading = true;

            try {
                const response = await axiosInstance.get(`employees/${id}`);

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async createEmployee(payload) {
            this.loading = true;

            try {
                const response = await axiosInstance.post('employees', payload, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                });

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async updateEmployee(id, payload) {
            this.loading = true;

            try {
                // Add _method PUT for Laravel to handle multipart form data
                payload.append('_method', 'PUT');

                const response = await axiosInstance.post(`employees/${id}`, payload, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                });

                this.success = response.data.message;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async deleteEmployee(id) {
            this.loading = true;
            this.error = null;
            this.success = null;

            try {
                const response = await axiosInstance.delete(`employees/${id}`);

                this.success = response.data.message;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },


        // Blocks/restores the employee's ability to log in -- distinct from
        // job_information.status, which only affects payroll/reporting.
        // Superadmin/Manager/Finance/Operational Director only; Manager/
        // Finance/Operational Director accounts can only be toggled by
        // Superadmin (enforced server-side).
        async toggleAccountStatus(id) {
            this.error = null;
            try {
                const response = await axiosInstance.post(`employees/${id}/toggle-account-status`);
                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async fetchLatestEmployees() {
            this.loadingLatest = true;

            try {
                const response = await axiosInstance.get('/employees', {
                    params: { limit: 5 }
                });

                this.latestEmployees = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loadingLatest = false;
            }
        },

        async fetchStatistics() {
            this.loadingStatistics = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('/employees/statistics');

                this.statistics = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loadingStatistics = false;
            }
        },

        async fetchContractAlerts(daysAhead = 30) {
            try {
                const response = await axiosInstance.get('/employees/contract-alerts', {
                    params: { days_ahead: daysAhead },
                });

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async fetchPerformanceStatistics(employeeId) {
            this.loadingStatistics = true;
            this.error = null;

            try {
                const response = await axiosInstance.get(`/employees/${employeeId}/performance-statistics`);

                this.performanceStatistics = response.data.data;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loadingStatistics = false;
            }
        },

        async fetchMyProfile() {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('/my-profile');

                this.myProfile = response.data.data;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        // The signed-in employee's own statistics, without touching the
        // shared performanceStatistics/loadingStatistics.
        async fetchMyPerformanceStatistics(employeeId) {
            const response = await axiosInstance.get(`/employees/${employeeId}/performance-statistics`);
            this.myPerformanceStatistics = response.data.data;
            return response.data.data;
        },

        // Merge fields into the cached own profile (after a self-service save).
        patchMyProfile(fields = {}) {
            if (!this.myProfile) return;
            this.myProfile = { ...this.myProfile, ...fields };
        },

        // Team, members and projects in parallel, kept in the store. Failures
        // of one part leave the others (and earlier data) in place.
        async loadMyTeamBundle(userId = null) {
            if (userId !== this.myTeamFor) {
                this.myTeam = null;
                this.myTeamMembers = [];
                this.myTeamProjects = [];
                this.myTeamLoaded = false;
                this.myTeamFor = userId;
            }
            const [team, members, projects] = await Promise.allSettled([
                axiosInstance.get('/my-team'),
                axiosInstance.get('/my-team/members'),
                axiosInstance.get('/my-team/projects'),
            ]);
            if (team.status === 'fulfilled') this.myTeam = team.value.data.data ?? null;
            else if (!this.myTeamLoaded) this.myTeam = null;
            if (members.status === 'fulfilled') this.myTeamMembers = members.value.data.data ?? [];
            if (projects.status === 'fulfilled') this.myTeamProjects = projects.value.data.data ?? [];
            this.myTeamLoaded = true;
            const failed = [team, members, projects].find((r) => r.status === 'rejected');
            if (failed) console.error('Error loading my team:', failed.reason);
        },

        async downloadIdCard(employeeCode) {
            const response = await axiosInstance.get('/my-profile/id-card', {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ID-Card-${employeeCode || 'employee'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        },

        async fetchMyTeam() {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('/my-team');

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchMyTeamMembers() {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('/my-team/members');

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchMyTeamProjects() {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('/my-team/projects');

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        // Success/error persist across route changes (Pinia stores are
        // singletons) -- without this, a stale message resurfaces every
        // time the list remounts, since nothing else ever clears it.
        clearMessages() {
            this.success = null;
            this.error = null;
        },

    }
})