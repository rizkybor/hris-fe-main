import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { openBlobPdf } from "@/utils/pdfTab";

let listSeq = 0;
let detailSeq = 0;

// Official memos (Nota Dinas).
export const useDocumentLetterStore = defineStore("documentLetter", {
  state: () => ({
    documentLetters: [],
    // Params of the list now shown (null until the first load).
    listKey: null,
    currentDocumentLetter: null,
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchDocumentLetters(params = {}) {
      const seq = ++listSeq;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/document-letters", {
          params: { row_per_page: 10, ...params },
        });
        // A response that comes back after a newer request is dropped.
        if (seq !== listSeq) return;
        this.documentLetters = data.data.data;
        this.meta = data.data.meta;
        this.listKey = JSON.stringify(params);
      } catch (error) {
        if (seq === listSeq) this.error = handleError(error);
      } finally {
        if (seq === listSeq) this.loading = false;
      }
    },

    // Shows the memo already in hand (same id) while it refreshes quietly;
    // `loading` (the skeleton) is only for a memo not loaded yet.
    async fetchDocumentLetter(id) {
      const seq = ++detailSeq;
      const cached = String(this.currentDocumentLetter?.id) === String(id);
      if (!cached) {
        this.currentDocumentLetter = null;
        this.loading = true;
      }
      this.error = null;
      try {
        const { data } = await axiosInstance.get(`/document-letters/${id}`);
        if (seq === detailSeq) this.currentDocumentLetter = data.data;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        if (seq === detailSeq) this.loading = false;
      }
    },

    // A saved memo from the API: the detail shown and its list row follow.
    applySaved(memo) {
      if (!memo?.id) return memo;
      if (String(this.currentDocumentLetter?.id) === String(memo.id)) {
        this.currentDocumentLetter = { ...this.currentDocumentLetter, ...memo };
      }
      const idx = this.documentLetters.findIndex((d) => d.id === memo.id);
      if (idx !== -1) this.documentLetters[idx] = { ...this.documentLetters[idx], ...memo };
      return memo;
    },

    async createDocumentLetter(formData) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/document-letters", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        this.success = data.message;
        // The detail page opens next: show the saved memo right away.
        this.currentDocumentLetter = data.data;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateDocumentLetter(id, formData) {
      this.error = null;
      try {
        formData.append("_method", "PUT");
        const { data } = await axiosInstance.post(`/document-letters/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        this.success = data.message;
        this.currentDocumentLetter = data.data;
        return this.applySaved(data.data);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteDocumentLetter(id) {
      this.error = null;
      try {
        await axiosInstance.delete(`/document-letters/${id}`);
        const before = this.documentLetters.length;
        this.documentLetters = this.documentLetters.filter((d) => d.id !== id);
        if (this.documentLetters.length < before && this.meta?.total) {
          this.meta = { ...this.meta, total: this.meta.total - 1, to: this.meta.to ? this.meta.to - 1 : this.meta.to };
        }
        if (this.currentDocumentLetter?.id === id) this.currentDocumentLetter = null;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async submitDocumentLetter(id) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post(`/document-letters/${id}/submit`);
        this.success = data.message;
        return this.applySaved(data.data);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async approveDocumentLetter(id) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post(`/document-letters/${id}/approve`);
        this.success = data.message;
        return this.applySaved(data.data);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async rejectDocumentLetter(id, rejectionReason) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post(`/document-letters/${id}/reject`, {
          rejection_reason: rejectionReason,
        });
        this.success = data.message;
        return this.applySaved(data.data);
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async downloadPdf(id, documentNumber) {
      const response = await axiosInstance.get(`/document-letters/${id}/export-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${(documentNumber || "nota-dinas").replace(/\//g, "-")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },

    // Opens the PDF inline in a new tab (browser's own viewer). Call it
    // straight from the click handler, without awaiting anything first.
    viewPdf(id, tab = window.open("", "_blank")) {
      return openBlobPdf(tab, () => axiosInstance.get(`/document-letters/${id}/export-pdf`, { responseType: "blob" }));
    },
  },
});
