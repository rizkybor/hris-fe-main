import { defineStore } from "pinia";
import { axiosInstance } from '@/plugins/axios';
import { handleError } from "@/helpers/errorHelper";

export const useTaskStore = defineStore("task", {
    state: () => ({
        tasks: [],
        loading: false,
        error: null,
        success: null,
    }),

    actions: {
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
            } finally {
                this.loading = false;
            }
        },

        async updateTaskStatus(taskId, newStatus) {
            this.error = null;

            try {
                // Find the task to get current data
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return;

                // Use existing updateTask endpoint
                const response = await axiosInstance.post(`project-tasks/${taskId}`, {
                    ...task,
                    status: newStatus,
                    _method: 'PUT',
                });

                // Update task status in local state
                const taskIndex = this.tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    this.tasks[taskIndex].status = newStatus;
                }

                return response.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    }
})
