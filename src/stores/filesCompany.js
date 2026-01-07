import { defineStore } from "pinia";
import axios from "axios";

export const useFilesCompanyStore = defineStore("FilesCompany", {
  state: () => ({
    archives: [],
    pagination: {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 0,
    },
    statistics: {
      total_archives: 0,
      last_uploaded: null,
    },
    loading: false,
    success: null,
    error: null,
  }),

  actions: {
    async fetchStatistics() {
      try {
        this.loading = true;
        const response = await axios.get("/files-companies/statistics");
        this.statistics = response.data.data;
      } catch (error) {
        console.error("Error fetching statistics:", error);
        this.error = error.response?.data?.message || error.message;
      } finally {
        this.loading = false;
      }
    },

    async fetchArchives({ search = "", page = 1, perPage = 10 } = {}) {
      try {
        this.loading = true;
        const response = await axios.get("/files-companies/all/paginated", {
          params: {
            search,
            row_per_page: perPage,
            page,
          },
        });

        const resData = response.data.data;
        this.archives = resData.data; // array of archives
        this.pagination = {
          current_page: resData.meta.current_page,
          last_page: resData.meta.last_page,
          per_page: resData.meta.per_page,
          total: resData.meta.total,
        };
      } catch (error) {
        console.error("Error fetching archives:", error);
        this.error = error.response?.data?.message || error.message;
      } finally {
        this.loading = false;
      }
    },

    async downloadArchive(file) {
      try {
        const response = await axios.get(`/files-companies/download/${file.id}`, {
          responseType: "blob",
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", file.document_name || file.name || "file");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Error downloading file:", error);
        this.error = error.response?.data?.message || error.message;
      }
    },
  },
});
