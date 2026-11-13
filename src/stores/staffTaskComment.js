import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useStaffTaskCommentStore = defineStore("staffTaskComment", {
    state: () => ({
        comments: [],
        // Task the `comments` belong to: switching tasks (drawer prev/next)
        // must not show the previous task's thread while the new one loads.
        staffTaskId: null,
        loading: false,
        submitting: false,
        error: null,
    }),

    actions: {
        async fetchComments(staffTaskId) {
            this.loading = true;
            this.error = null;
            if (String(this.staffTaskId) !== String(staffTaskId)) {
                this.comments = [];
                this.staffTaskId = staffTaskId;
            }

            try {
                const response = await axiosInstance.get(`staff-tasks/${staffTaskId}/comments`);
                if (String(this.staffTaskId) !== String(staffTaskId)) return;
                this.comments = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async createComment(staffTaskId, payload) {
            this.submitting = true;
            this.error = null;

            try {
                const response = await axiosInstance.post(`staff-tasks/${staffTaskId}/comments`, payload);
                this.comments.push(response.data.data);
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.submitting = false;
            }
        },

        async deleteComment(id) {
            try {
                await axiosInstance.delete(`staff-task-comments/${id}`);

                const toRemove = new Set([id]);
                let changed = true;
                while (changed) {
                    changed = false;
                    for (const comment of this.comments) {
                        if (comment.parent_id && toRemove.has(comment.parent_id) && !toRemove.has(comment.id)) {
                            toRemove.add(comment.id);
                            changed = true;
                        }
                    }
                }

                this.comments = this.comments.filter((comment) => !toRemove.has(comment.id));
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
