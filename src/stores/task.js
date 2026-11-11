import { defineStore } from "pinia";
import { axiosInstance } from '@/plugins/axios';
import { handleError } from "@/helpers/errorHelper";
import { toRequestBody } from "@/helpers/formDataHelper";

export const useTaskStore = defineStore("task", {
    state: () => ({
        tasks: [],
        // Which project `tasks` belongs to (cleared on switch so another
        // project's board never shows while the new one loads).
        tasksProjectId: null,
        myTasks: [],
        // fetchMyTasks results per "limit:includeCompleted", so the dashboard
        // widget (20), profile (5) and My Tasks page (200) don't overwrite
        // each other. myTasks stays the latest result for older callers.
        myTasksCache: {},
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
                this.myTasksCache = { ...this.myTasksCache, [`${limit}:${includeCompleted}`]: response.data.data };
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchProjectTasks(projectId) {
            if (String(this.tasksProjectId) !== String(projectId)) {
                this.tasks = [];
                this.tasksProjectId = projectId;
            }
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
                const response = await axiosInstance.post('project-tasks', toRequestBody(payload));
                const created = response.data.data;

                // Put the new card on the board straight away (no refetch).
                // The create response carries no assignee relation.
                if (created && String(created.project_id) === String(this.tasksProjectId) && !this.tasks.some((t) => t.id === created.id)) {
                    this.tasks.push({ assignee: null, ...created });
                }

                this.success = response.data.message;
                return created;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        // `localFields` (optional) are merged over the response before it is
        // stored -- e.g. the picked `assignee`, since the update response
        // still carries the relation loaded before the change.
        async updateTask(id, payload, localFields = null) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.post(`project-tasks/${id}`, toRequestBody({
                    ...payload,
                    _method: 'PUT',
                }));

                const fresh = response.data.data ? { ...response.data.data, ...(localFields || {}) } : null;

                // Update task in local state
                const taskIndex = this.tasks.findIndex(t => t.id === id);
                if (taskIndex !== -1 && fresh) {
                    this.tasks[taskIndex] = fresh;
                }
                if (fresh) this.patchMyTasks(id, fresh);

                this.success = response.data.message;
                return fresh;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        // Merge fresh fields of a task into the My Tasks lists (they may carry
        // extra relations, so merge instead of replacing the object).
        patchMyTasks(id, fields) {
            const merge = (list) => list.forEach((t) => t.id === id && Object.assign(t, fields));
            merge(this.myTasks);
            Object.values(this.myTasksCache).forEach(merge);
        },

        async deleteTask(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.delete(`project-tasks/${id}`);

                this.tasks = this.tasks.filter((t) => t.id !== id);
                this.myTasks = this.myTasks.filter((t) => t.id !== id);
                this.myTasksCache = Object.fromEntries(
                    Object.entries(this.myTasksCache).map(([key, list]) => [key, list.filter((t) => t.id !== id)])
                );

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

                // A cross-column move is placed by the server (priority
                // cluster) -- take its status/position instead of refetching.
                const fresh = response.data?.data;
                if (fresh) {
                    if (fresh.status !== undefined) task.status = fresh.status;
                    if (fresh.position !== undefined && fresh.position !== null) task.position = fresh.position;
                    this.patchMyTasks(taskId, { status: task.status });
                }

                return response.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    }
})
