import { defineStore } from "pinia";

export const useFilesCompanyStore = defineStore("FilesCompany", {
  state: () => ({
    archives: [],
    statistics: {
      total_archives: 0,
      last_uploaded: null,
    },
    loading: false,
    success: null,
  }),

  actions: {
    async fetchStatistics() {
      this.statistics = {
        total_archives: 12,
        last_uploaded: "2025-01-18",
      };
    },

    async fetchArchives() {
      this.loading = true;

      this.archives = [
        {
          id: 1,
          file_name: "Kontrak Vendor.pdf",
          file_url: "/archives/kontrak-vendor.pdf",
          description: "Kontrak kerja sama vendor",
          uploaded_at: "2025-01-18",
          uploaded_by: "Admin IT",
        },
      ];

      this.loading = false;
    },
  },
});
