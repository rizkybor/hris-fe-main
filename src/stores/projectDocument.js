import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useProjectDocumentStore = defineStore("projectDocument", {
  state: () => ({
    documents: [],
    loading: false,
    uploading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchByProject(projectId) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/project-documents", {
          params: { project_id: projectId },
        });
        this.documents = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async uploadDocument(payload) {
      this.uploading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/project-documents", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        this.documents.unshift(data.data);
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.uploading = false;
      }
    },

    async deleteDocument(id) {
      this.error = null;
      try {
        const { data } = await axiosInstance.delete(`/project-documents/${id}`);
        this.documents = this.documents.filter((d) => d.id !== id);
        this.success = data.message;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },
  },
});
