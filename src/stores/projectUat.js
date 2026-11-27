import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { errorMessage } from "@/helpers/errorHelper";

// UAT of one project: the rounds agreed with the client and each round held.
// Every write returns the whole UAT summary, which replaces `uat`.
const EMPTY = { planned: null, done: 0, recorded: 0, remaining: null, over_plan: false, passed_round: null, sessions: [] };

export const useProjectUatStore = defineStore("projectUat", {
  state: () => ({
    uat: { ...EMPTY },
    projectId: null,
    loading: false,
    saving: false,
  }),

  actions: {
    async fetch(projectId) {
      if (String(this.projectId) !== String(projectId)) {
        this.uat = { ...EMPTY };
        this.projectId = projectId;
      }
      this.loading = true;
      try {
        const { data } = await axiosInstance.get(`/projects/${projectId}/uat`);
        this.uat = data.data;
      } finally {
        this.loading = false;
      }
    },

    async write(request) {
      this.saving = true;
      try {
        const { data } = await request();
        this.uat = data.data;
        return data.data;
      } catch (error) {
        throw new Error(errorMessage(error));
      } finally {
        this.saving = false;
      }
    },

    setPlan(projectId, planned) {
      return this.write(() => axiosInstance.put(`/projects/${projectId}/uat/plan`, { uat_rounds_planned: planned }));
    },

    // payload: FormData (may carry an attachment)
    createSession(projectId, payload) {
      return this.write(() => axiosInstance.post(`/projects/${projectId}/uat/sessions`, payload, { headers: { "Content-Type": "multipart/form-data" } }));
    },

    updateSession(projectId, sessionId, payload) {
      payload.append("_method", "PUT");
      return this.write(() => axiosInstance.post(`/projects/${projectId}/uat/sessions/${sessionId}`, payload, { headers: { "Content-Type": "multipart/form-data" } }));
    },

    // Findings / notes are added, edited and deleted straight from a session.
    // payload: FormData (may carry an attachment file).
    addItem(projectId, locationId, payload) {
      return this.write(() => axiosInstance.post(`/projects/${projectId}/uat/locations/${locationId}/items`, payload, { headers: { "Content-Type": "multipart/form-data" } }));
    },

    updateItem(projectId, itemId, payload) {
      payload.append("_method", "PUT");
      return this.write(() => axiosInstance.post(`/projects/${projectId}/uat/items/${itemId}`, payload, { headers: { "Content-Type": "multipart/form-data" } }));
    },

    // Berita Acara: a numbered BA letter per UAT (generated / refreshed).
    async generateBeritaAcara(projectId, sessionId, data) {
      this.saving = true;
      try {
        const { data: response } = await axiosInstance.post(`/projects/${projectId}/uat/sessions/${sessionId}/berita-acara`, data);
        this.uat = response.data.uat;
        return response.data.letter;
      } catch (error) {
        throw new Error(errorMessage(error));
      } finally {
        this.saving = false;
      }
    },

    deleteItem(projectId, itemId) {
      return this.write(() => axiosInstance.delete(`/projects/${projectId}/uat/items/${itemId}`));
    },

    // Check a finding/note off as revised/updated (or undo).
    resolveItem(projectId, itemId, resolved) {
      return this.write(() => axiosInstance.patch(`/projects/${projectId}/uat/items/${itemId}/resolve`, { resolved }));
    },

    uploadItemPhoto(projectId, itemId, file) {
      const payload = new FormData();
      payload.append("photo", file);
      return this.write(() => axiosInstance.post(`/projects/${projectId}/uat/items/${itemId}/photo`, payload, { headers: { "Content-Type": "multipart/form-data" } }));
    },

    deleteItemPhoto(projectId, itemId) {
      return this.write(() => axiosInstance.delete(`/projects/${projectId}/uat/items/${itemId}/photo`));
    },

    deleteSession(projectId, sessionId) {
      return this.write(() => axiosInstance.delete(`/projects/${projectId}/uat/sessions/${sessionId}`));
    },
  },
});
