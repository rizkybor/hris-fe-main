import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { invalidate } from "@/composables/useStaleFetch";
import { openBlobPdf } from "@/utils/pdfTab";

let listSeq = 0; // latest fetchProposals call

export const useProposalStore = defineStore("proposal", {
  state: () => ({
    proposals: [],
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 0,
    },
    // Params of the list currently held (null until the first load).
    listKey: null,
    loading: false,
    saving: false,
    error: null,
  }),

  actions: {
    async fetchProposals(params = {}) {
      // Only the latest request writes the list (search and filters can
      // change while an older request is still in flight).
      const seq = ++listSeq;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/proposals", { params });
        if (seq !== listSeq) return;
        this.proposals = data.data.data;
        this.meta = data.data.meta;
        this.listKey = JSON.stringify(params);
      } catch (error) {
        if (seq === listSeq) this.error = handleError(error);
      } finally {
        if (seq === listSeq) this.loading = false;
      }
    },

    // Puts saved fields into the listed row, if it's on the page held.
    patchRow(id, fields) {
      const row = this.proposals.find((p) => String(p.id) === String(id));
      if (row && fields) Object.assign(row, fields);
    },

    async fetchProposal(id) {
      const { data } = await axiosInstance.get(`/proposals/${id}`);
      return data.data;
    },

    async createProposal(payload) {
      this.saving = true;
      try {
        const { data } = await axiosInstance.post("/proposals", payload);
        invalidate("proposals-list"); // the new one belongs at the top
        return data.data;
      } finally {
        this.saving = false;
      }
    },

    async updateProposal(id, payload) {
      this.saving = true;
      try {
        const { data } = await axiosInstance.put(`/proposals/${id}`, payload);
        this.patchRow(id, data.data);
        return data.data;
      } finally {
        this.saving = false;
      }
    },

    async duplicateProposal(id) {
      const { data } = await axiosInstance.post(`/proposals/${id}/duplicate`);
      invalidate("proposals-list");
      return data.data;
    },

    async deleteProposal(id) {
      await axiosInstance.delete(`/proposals/${id}`);
      const before = this.proposals.length;
      this.proposals = this.proposals.filter((p) => p.id !== id);
      if (this.proposals.length < before && this.meta) this.meta = { ...this.meta, total: Math.max(0, (this.meta.total ?? 1) - 1) };
      invalidate("proposals-list"); // other pages shift by one
    },

    // ----- Share link -----
    async shareProposal(id, expiresInDays = null) {
      const { data } = await axiosInstance.post(`/proposals/${id}/share`, { expires_in_days: expiresInDays });
      return data.data;
    },

    async unshareProposal(id) {
      const { data } = await axiosInstance.delete(`/proposals/${id}/share`);
      return data.data;
    },

    async shareByEmail(id, payload) {
      const { data } = await axiosInstance.post(`/proposals/${id}/share/email`, payload);
      return data.data;
    },

    async uploadImage(file) {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await axiosInstance.post("/proposals/images", formData);
      return data.data; // { public_id, url }
    },

    viewPdf(id, tab = window.open("", "_blank")) {
      return openBlobPdf(tab, () => axiosInstance.get(`/proposals/${id}/export-pdf`, { responseType: "blob" }));
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
