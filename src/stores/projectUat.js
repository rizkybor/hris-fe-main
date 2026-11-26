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

    deleteSession(projectId, sessionId) {
      return this.write(() => axiosInstance.delete(`/projects/${projectId}/uat/sessions/${sessionId}`));
    },
  },
});
