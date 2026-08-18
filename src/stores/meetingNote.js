import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useMeetingNoteStore = defineStore("meetingNote", {
  state: () => ({
    meetingNotes: [],
    pinnedMeetingNotes: [],
    currentMeetingNote: null,
    activeViewers: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchMeetingNotes(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/meeting-notes", {
          params: { row_per_page: 10, ...params },
        });
        this.meetingNotes = data.data.data;
        this.meta = data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchPinnedMeetingNotes() {
      try {
        const { data } = await axiosInstance.get("/meeting-notes/pinned");
        this.pinnedMeetingNotes = data.data;
      } catch (error) {
        this.error = handleError(error);
      }
    },

    async fetchMeetingNote(id) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get(`/meeting-notes/${id}`);
        this.currentMeetingNote = data.data;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createMeetingNote(formData) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/meeting-notes", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateMeetingNote(id, formData) {
      this.error = null;
      try {
        formData.append("_method", "PUT");
        const { data } = await axiosInstance.post(`/meeting-notes/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteMeetingNote(id) {
      this.error = null;
      try {
        await axiosInstance.delete(`/meeting-notes/${id}`);
        this.meetingNotes = this.meetingNotes.filter((n) => n.id !== id);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async togglePin(id) {
      const { data } = await axiosInstance.post(`/meeting-notes/${id}/pin`);
      return data.data.is_pinned;
    },

    async sendHeartbeat(id, isEditing = false) {
      try {
        await axiosInstance.post(`/meeting-notes/${id}/heartbeat`, { is_editing: isEditing });
      } catch {
        // Presence pings are best-effort -- a dropped heartbeat shouldn't
        // interrupt the user's work.
      }
    },

    async fetchActiveViewers(id) {
      try {
        const { data } = await axiosInstance.get(`/meeting-notes/${id}/viewers`);
        this.activeViewers = data.data;
      } catch {
        // Same as sendHeartbeat -- non-critical background polling.
      }
    },
  },
});
