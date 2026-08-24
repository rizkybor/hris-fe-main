import { defineStore } from "pinia";
import { axiosInstance } from '@/plugins/axios';
import { handleError } from "@/helpers/errorHelper";

export const useProjectStore = defineStore("project", {
    state: () => ({
        projects: [],
        statistics: {
            total: 0,
            active: 0,
            completed: 0,
            on_hold: 0,
            added_this_month: 0,
            active_change: 0,
            total_tasks: 0,
            completed_tasks: 0,
            in_progress_tasks: 0,
            tasks_this_month: 0,
            completion_rate: 0,
            total_budget: 0,
            budget_by_month: [],
        },
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0
        },
        loading: false,
        loadingStatistics: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchProjects(params) {
            this.loading = true

            try {
                const response = await axiosInstance.get(`projects`, { params })

                this.projects = response.data.data
            } catch (error) {
                this.error = handleError(error)
            } finally {
                this.loading = false
            }
        },

        async fetchProjectsPaginated(params) {
            this.loading = true;

            try {
                const response = await axiosInstance.get('/projects/all/paginated', { params });

                this.projects = response.data.data.data;
                this.meta = response.data.data.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchProjectById(id) {
            this.loading = true;

            try {
                const response = await axiosInstance.get(`projects/${id}`);

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchProject(id) {
            this.loading = true;

            try {
                const response = await axiosInstance.get(`projects/${id}`);

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },


        async createProject(payload) {
            this.loading = true;

            try {
                const response = await axiosInstance.post('projects', payload);

                this.success = response.data.message;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async updateProject(id, payload) {
            this.loading = true;

            try {
                const response = await axiosInstance.post(`projects/${id}`, {
                    ...payload,
                    _method: 'PUT',
                });

                this.success = response.data.message;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        // Project Inspect: a rich-text note only the Project Leader may
        // write (enforced server-side in ProjectController::update()) --
        // a dedicated, single-field action rather than routing it through
        // updateProject() so the Detail page's inline editor doesn't need
        // to resend the whole form (photo included) just to save a note.
        async updateInspectNote(id, note) {
            this.error = null;

            try {
                const response = await axiosInstance.put(`projects/${id}`, { inspect_note: note });

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async deleteProject(id) {
            this.loading = true;

            try {
                const response = await axiosInstance.delete(`projects/${id}`);

                this.success = response.data.message;
                this.projects = this.projects.filter((p) => p.id !== id);
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchStatistics() {
            this.loadingStatistics = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('/projects/statistics');

                this.statistics = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loadingStatistics = false;
            }
        },

        async downloadProgressReport(id, name) {
            const response = await axiosInstance.get(`/projects/${id}/export-progress`, {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${(name || "project").replace(/\//g, "-")}-progress-report.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        },

    }
})