import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

let listRequest = 0; // newest fetchStaffTasks call

export const useStaffTaskStore = defineStore("staffTask", {
    state: () => ({
        staffTasks: [],
        currentStaffTask: null,
        myStaffTasks: [],
        staffOptions: [],
        meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
        // Serialized params the current `staffTasks` page belongs to, so a
        // page coming back can tell whether what's in the store is its data.
        listKey: null,
        // Recap numbers (GET /staff-tasks/summary), kept here so revisits
        // show them at once and refresh quietly.
        summary: null,
        summaryFailed: false,
        loading: false,
        // Separate from `loading` so opening one task doesn't flash the list.
        detailLoading: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchStaffTasks(params = {}) {
            this.loading = true;
            this.error = null;
            // Only the newest request may write the list (fast typing / paging).
            const req = ++listRequest;

            try {
                const response = await axiosInstance.get("/staff-tasks", { params });
                if (req !== listRequest) return;

                this.staffTasks = response.data.data?.data ?? [];
                this.meta = response.data.data?.meta ?? this.meta;
                this.listKey = JSON.stringify(params);
            } catch (error) {
                if (req === listRequest) this.error = handleError(error);
            } finally {
                if (req === listRequest) this.loading = false;
            }
        },

        async fetchSummary() {
            try {
                const response = await axiosInstance.get("/staff-tasks/summary");
                this.summary = response.data.data;
                this.summaryFailed = false;
            } catch (error) {
                // Keep the last numbers if there are any; only flag a failure
                // when there is nothing to show.
                if (!this.summary) this.summaryFailed = true;
                handleError(error);
            }
        },

        // Put a task returned by the API into the list without refetching:
        // replace it in place, or (when `prepend`) add it on top of the page.
        upsertStaffTask(task, { prepend = false } = {}) {
            if (!task?.id) return;
            const index = this.staffTasks.findIndex((t) => t.id === task.id);
            if (index !== -1) {
                this.staffTasks.splice(index, 1, { ...this.staffTasks[index], ...task });
            } else if (prepend) {
                this.staffTasks.unshift(task);
                const perPage = Number(this.meta?.per_page) || 0;
                if (perPage && this.staffTasks.length > perPage) this.staffTasks.length = perPage;
                this.meta = { ...this.meta, total: (Number(this.meta?.total) || 0) + 1 };
                this.meta.last_page = perPage ? Math.max(1, Math.ceil(this.meta.total / perPage)) : this.meta.last_page;
                this.meta.to = Math.min(this.meta.total, (this.meta.from || 1) + this.staffTasks.length - 1);
            }
            if (this.currentStaffTask?.id === task.id) this.currentStaffTask = { ...this.currentStaffTask, ...task };
        },

        async fetchStaffTask(id) {
            this.detailLoading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get(`/staff-tasks/${id}`);
                this.currentStaffTask = response.data.data;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.detailLoading = false;
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
                this.upsertStaffTask(response.data.data);
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },

        async deleteStaffTask(id) {
            try {
                await axiosInstance.delete(`/staff-tasks/${id}`);
                const before = this.staffTasks.length;
                this.staffTasks = this.staffTasks.filter((t) => t.id !== id);
                if (this.staffTasks.length < before && this.meta) {
                    const total = Math.max(0, (Number(this.meta.total) || 0) - 1);
                    const perPage = Number(this.meta.per_page) || 0;
                    this.meta = {
                        ...this.meta,
                        total,
                        to: Math.max(0, (Number(this.meta.to) || 0) - 1),
                        last_page: perPage ? Math.max(1, Math.ceil(total / perPage)) : this.meta.last_page,
                    };
                }
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

        // Patch one assignee row ({ id, status, status_updated_at }) of a task
        // in the list and the open detail, and recount its progress.
        patchAssignee(taskId, assignment) {
            if (!assignment?.id) return;
            for (const task of [this.staffTasks.find((t) => t.id === taskId), this.currentStaffTask?.id === taskId ? this.currentStaffTask : null]) {
                if (!task?.assignees) continue;
                const row = task.assignees.find((a) => a.id === assignment.id);
                if (!row) continue;
                Object.assign(row, assignment);
                task.progress = { done: task.assignees.filter((a) => a.status === "done").length, total: task.assignees.length };
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
                // Keep the admin list's copy of the same assignment in step.
                this.patchAssignee(id, response.data.data);

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
