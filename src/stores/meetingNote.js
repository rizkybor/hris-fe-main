import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { openBlobPdf } from "@/utils/pdfTab";

let listSeq = 0;
let detailSeq = 0;

export const useMeetingNoteStore = defineStore("meetingNote", {
  state: () => ({
    meetingNotes: [],
    // Params of the list now shown (null until the first load).
    listKey: null,
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
      const seq = ++listSeq;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/meeting-notes", {
          params: { row_per_page: 10, ...params },
        });
        // A response that comes back after a newer request is dropped.
        if (seq !== listSeq) return;
        this.meetingNotes = data.data.data;
        this.meta = data.data.meta;
        this.listKey = JSON.stringify(params);
      } catch (error) {
        if (seq === listSeq) this.error = handleError(error);
      } finally {
        if (seq === listSeq) this.loading = false;
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

    // Shows the note already in hand (same id) while it refreshes quietly;
    // `loading` (the skeleton) is only for a note not loaded yet.
    async fetchMeetingNote(id) {
      const seq = ++detailSeq;
      const cached = String(this.currentMeetingNote?.id) === String(id);
      if (!cached) {
        this.currentMeetingNote = null;
        this.activeViewers = [];
        this.loading = true;
      }
      this.error = null;
      try {
        const { data } = await axiosInstance.get(`/meeting-notes/${id}`);
        if (seq === detailSeq) this.currentMeetingNote = data.data;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        if (seq === detailSeq) this.loading = false;
      }
    },

    // A saved note: the detail shown and its list row follow.
    applySaved(note) {
      if (!note?.id) return note;
      this.currentMeetingNote = String(this.currentMeetingNote?.id) === String(note.id) ? { ...this.currentMeetingNote, ...note } : note;
      const idx = this.meetingNotes.findIndex((n) => n.id === note.id);
      if (idx !== -1) this.meetingNotes[idx] = { ...this.meetingNotes[idx], ...note };
      return note;
    },

    async createMeetingNote(formData) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/meeting-notes", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        this.success = data.message;
        return this.applySaved(data.data);
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
        return this.applySaved(data.data);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteMeetingNote(id) {
      this.error = null;
      try {
        await axiosInstance.delete(`/meeting-notes/${id}`);
        const before = this.meetingNotes.length;
        this.meetingNotes = this.meetingNotes.filter((n) => n.id !== id);
        if (this.meetingNotes.length < before && this.meta?.total) {
          this.meta = { ...this.meta, total: this.meta.total - 1, to: this.meta.to ? this.meta.to - 1 : this.meta.to };
        }
        this.pinnedMeetingNotes = this.pinnedMeetingNotes.filter((n) => n.id !== id);
        if (this.currentMeetingNote?.id === id) this.currentMeetingNote = null;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    // Returns the new pinned state; the list row and the open note follow.
    async togglePin(id) {
      const { data } = await axiosInstance.post(`/meeting-notes/${id}/pin`);
      const pinned = data.data.is_pinned;
      const row = this.meetingNotes.find((n) => n.id === id);
      if (row) row.is_pinned = pinned;
      if (this.currentMeetingNote?.id === id) this.currentMeetingNote.is_pinned = pinned;
      return pinned;
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

    // Saves the note as a PDF ("Notulen Rapat"). Fetched as a blob because
    // the route needs the auth header, so a plain link can't be used.
    async downloadPdf(id, documentNumber) {
      const response = await axiosInstance.get(`/meeting-notes/${id}/export-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Notulen-${(documentNumber || id).toString().replace(/[\/\\\s]/g, "-")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },

    // Opens the PDF in the browser's own viewer in a new tab. Call it
    // straight from the click handler, without awaiting anything first.
    viewPdf(id, tab = window.open("", "_blank")) {
      return openBlobPdf(tab, () => axiosInstance.get(`/meeting-notes/${id}/export-pdf`, { responseType: "blob" }));
    },
  },
});
