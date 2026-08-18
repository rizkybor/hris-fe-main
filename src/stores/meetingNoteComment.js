import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useMeetingNoteCommentStore = defineStore("meetingNoteComment", {
    state: () => ({
        comments: [],
        loading: false,
        submitting: false,
        error: null,
    }),

    actions: {
        async fetchComments(meetingNoteId) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get(`meeting-notes/${meetingNoteId}/comments`);
                this.comments = response.data.data;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async createComment(meetingNoteId, payload) {
            this.submitting = true;
            this.error = null;

            try {
                const response = await axiosInstance.post(`meeting-notes/${meetingNoteId}/comments`, payload);
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
                await axiosInstance.delete(`meeting-note-comments/${id}`);
                this.comments = this.comments.filter((comment) => comment.id !== id);
            } catch (error) {
                this.error = handleError(error);
                throw error;
            }
        },
    },
});
