import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useProposalStore = defineStore("proposal", {
  state: () => ({
    proposals: [],
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 0,
    },
    loading: false,
    saving: false,
    error: null,
  }),

  actions: {
    async fetchProposals(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/proposals", { params });
        this.proposals = data.data.data;
        this.meta = data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchProposal(id) {
      const { data } = await axiosInstance.get(`/proposals/${id}`);
      return data.data;
    },

    async createProposal(payload) {
      this.saving = true;
      try {
        const { data } = await axiosInstance.post("/proposals", payload);
        return data.data;
      } finally {
        this.saving = false;
      }
    },

    async updateProposal(id, payload) {
      this.saving = true;
      try {
        const { data } = await axiosInstance.put(`/proposals/${id}`, payload);
        return data.data;
      } finally {
        this.saving = false;
      }
    },

    async duplicateProposal(id) {
      const { data } = await axiosInstance.post(`/proposals/${id}/duplicate`);
      return data.data;
    },

    async deleteProposal(id) {
      await axiosInstance.delete(`/proposals/${id}`);
      this.proposals = this.proposals.filter((p) => p.id !== id);
    },

    async uploadImage(file) {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await axiosInstance.post("/proposals/images", formData);
      return data.data; // { public_id, url }
    },

    // Opens the PDF in the browser's own viewer in a new tab. The window is
    // opened before the request so popup blockers treat it as part of the
    // click, then pointed at the PDF once it arrives.
    async viewPdf(id) {
      const tab = window.open("", "_blank");
      try {
        const response = await axiosInstance.get(`/proposals/${id}/export-pdf`, { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        if (tab) tab.location.href = url;
        else window.open(url, "_blank");
      } catch (error) {
        tab?.close();
        throw error;
      }
    },

    async downloadPdf(id, filename) {
      const response = await axiosInstance.get(`/proposals/${id}/export-pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${filename || "proposal-penawaran"}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  },
});
