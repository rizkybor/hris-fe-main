import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useTaskCommentStore = defineStore("taskComment", {
    state: () => ({
        comments: [],
        loading: false,
        submitting: false,
        error: null,
    }),

    actions: {
        async fetchComments(taskId) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get(`project-tasks/${taskId}/comments`);
                this.comments = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async createComment(taskId, payload) {
            this.submitting = true;
            this.error = null;

            try {
                const response = await axiosInstance.post(`project-tasks/${taskId}/comments`, payload);
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
                await axiosInstance.delete(`project-task-comments/${id}`);

                // The backend cascades the delete to every descendant reply
                // (any depth), so local state needs the same sweep -- just
                // filtering out `id` would leave its replies orphaned in the
                // thread view until the next full fetchComments().
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
