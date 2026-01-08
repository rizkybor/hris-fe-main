import { defineStore } from "pinia";
import axios from "axios";

export const useFilesCompanyStore = defineStore("FilesCompany", {
  state: () => ({
    archives: [],
    currentArchive: null,
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
    // ================= FETCH =================
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

    // ================= FETCH DETAIL =================
    async fetchArchiveById(id) {
      try {
        this.loading = true;
        const response = await axios.get(`/files-companies/${id}`);
        this.currentArchive = response.data.data;
        return this.currentArchive;
      } catch (error) {
        console.error("Error fetching archive detail:", error);
        this.error = error.response?.data?.message || error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ================= DOWNLOAD =================
    async downloadArchive(file) {
      try {
        const response = await axios.get(`/files-companies/${file.id}`);
        const archive = response.data.data;

        console.log(file);
        console.log(archive.document_path, "<<< CEK");

        if (!archive.document_path) {
          alert("File not available for download.");
          return;
        }

        // Trigger download
        const link = document.createElement("a");
        link.href = archive.document_path;
        link.target = "_blank"; 
        link.download = archive.document_name || "file"; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Error downloading file:", error);
        this.error = error.response?.data?.message || error.message;
      }
    },

     // async downloadArchive(file) {
    //   try {
    //     // Ambil file detail dulu (opsional)
    //     const responseDetail = await axios.get(`/files-companies/${file.id}`);
    //     const archive = responseDetail.data.data;

    //     if (!archive.document_path) {
    //       alert("File not available for download.");
    //       return;
    //     }

    //     // Ambil file sebagai blob
    //     const responseFile = await axios.get(archive.document_path, {
    //       responseType: "blob", // penting supaya dapat blob
    //     });

    //     // Buat link download
    //     const url = window.URL.createObjectURL(new Blob([responseFile.data]));
    //     const link = document.createElement("a");
    //     link.href = url;
    //     link.download = archive.document_name || "file";
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);

    //     // Bersihkan URL object setelah download
    //     window.URL.revokeObjectURL(url);
    //   } catch (error) {
    //     console.error("Error downloading file:", error);
    //     this.error = error.response?.data?.message || error.message;
    //   }
    // },

    // ================= CREATE =================
    async createArchive(formData) {
      try {
        this.loading = true;
        const response = await axios.post("/files-companies", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const newArchive = response.data.data;

        // Tambahkan file baru ke depan array archives
        this.archives.unshift(newArchive);

        this.success = "File uploaded successfully";
        return newArchive;
      } catch (error) {
        console.error("Error creating archive:", error);
        this.error = error.response?.data?.message || error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ================= UPDATE =================
    async updateArchive(id, formData) {
      try {
        this.loading = true;
        const response = await axios.post(`/files-companies/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const updatedArchive = response.data.data;

        // Update state archives agar UI langsung berubah
        const index = this.archives.findIndex((item) => item.id === id);
        if (index !== -1) {
          this.archives[index] = updatedArchive;
        }

        this.success = "File updated successfully";
        return updatedArchive;
      } catch (error) {
        console.error("Error updating archive:", error);
        this.error = error.response?.data?.message || error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ================= DELETE =================
    async deleteArchive(id) {
      try {
        this.loading = true;
        await axios.delete(`/files-companies/${id}`);

        // Hapus dari state archives
        this.archives = this.archives.filter((archive) => archive.id !== id);

        this.success = "File deleted successfully";
      } catch (error) {
        console.error("Error deleting archive:", error);
        this.error = error.response?.data?.message || error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
