import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useDocumentLetterStore = defineStore("documentLetter", {
  state: () => ({
    documentLetters: [],
    currentDocumentLetter: null,
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchDocumentLetters(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/document-letters", {
          params: { row_per_page: 10, ...params },
        });
        this.documentLetters = data.data.data;
        this.meta = data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchDocumentLetter(id) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get(`/document-letters/${id}`);
        this.currentDocumentLetter = data.data;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createDocumentLetter(formData) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/document-letters", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        this.success = data.message;
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
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteDocumentLetter(id) {
      this.error = null;
      try {
        await axiosInstance.delete(`/document-letters/${id}`);
        this.documentLetters = this.documentLetters.filter((d) => d.id !== id);
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
        return data.data;
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
        return data.data;
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
        return data.data;
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
  },
});
