import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

let fetchSeq = 0;

export const useMeetingNoteCommentStore = defineStore("meetingNoteComment", {
    state: () => ({
        comments: [],
        // The note `comments` belong to.
        noteId: null,
        loading: false,
        submitting: false,
        error: null,
    }),

    actions: {
        // Coming back to the same note shows its thread at once and refreshes
        // quietly; another note's thread is never shown while this one loads.
        async fetchComments(meetingNoteId) {
            const seq = ++fetchSeq;
            if (String(this.noteId) !== String(meetingNoteId)) {
                this.comments = [];
                this.noteId = meetingNoteId;
                this.loading = true;
            }
            this.error = null;

            try {
                const response = await axiosInstance.get(`meeting-notes/${meetingNoteId}/comments`);
                if (seq === fetchSeq) this.comments = response.data.data;
            } catch (error) {
                if (seq === fetchSeq) this.error = handleError(error);
            } finally {
                if (seq === fetchSeq) this.loading = false;
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
