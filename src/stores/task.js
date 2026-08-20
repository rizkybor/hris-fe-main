import { defineStore } from "pinia";
import { axiosInstance } from '@/plugins/axios';
import { handleError } from "@/helpers/errorHelper";

export const useTaskStore = defineStore("task", {
    state: () => ({
        tasks: [],
        myTasks: [],
        loading: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchMyTasks(limit = 5, includeCompleted = false) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('my-tasks', {
                    params: { limit, include_completed: includeCompleted }
                });

                this.myTasks = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchProjectTasks(projectId) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get('project-tasks', {
                    params: {
                        project_id: projectId
                    }
                });

                this.tasks = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async createTask(payload) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.post('project-tasks', payload);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async updateTask(id, payload) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.post(`project-tasks/${id}`, {
                    ...payload,
                    _method: 'PUT',
                });

                // Update task in local state
                const taskIndex = this.tasks.findIndex(t => t.id === id);
                if (taskIndex !== -1 && response.data.data) {
                    this.tasks[taskIndex] = response.data.data;
                }

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async deleteTask(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.delete(`project-tasks/${id}`);

                this.success = response.data.message;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        // Kanban drag-and-drop persistence -- status change and/or a new
        // fractional `position` within the target (project_id, status)
        // column, computed by the caller from the task's new neighbors.
        async moveTask(taskId, { status, position } = {}) {
            this.error = null;

            try {
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                // Only send the fields that actually changed -- spreading the
                // full task object here would forward its resolved `image`
                // URL string (and other nested objects like `assignee`) back
                // as if they were raw form fields, which the image upload
                // validation would then reject.
                const payload = { _method: 'PUT' };
                if (status !== undefined) payload.status = status;
                if (position !== undefined) payload.position = position;

                // Optimistic local update so the board feels instant instead
                // of waiting on the round trip.
                if (status !== undefined) task.status = status;
                if (position !== undefined) task.position = position;

                const response = await axiosInstance.post(`project-tasks/${taskId}`, payload);

                return response.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    }
})
