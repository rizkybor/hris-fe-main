import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useBackupStore = defineStore("backup", {
  state: () => ({
    backups: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    loading: false,
    creating: false,
    restoringId: null,
    error: null,
    success: null,
  }),

  actions: {
    async fetchBackups(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/backups", {
          params: { row_per_page: 10, ...params },
        });
        this.backups = data.data.data;
        this.meta = data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createBackup() {
      this.creating = true;
      this.error = null;
      this.success = null;
      try {
        const { data } = await axiosInstance.post("/backups");
        this.backups.unshift(data.data);
        this.meta.total += 1;
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.creating = false;
      }
    },

    async downloadBackup(id, filename) {
      const response = await axiosInstance.get(`/backups/${id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/sql" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename || "hris-backup.sql");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },

    async deleteBackup(id) {
      await axiosInstance.delete(`/backups/${id}`);
      this.backups = this.backups.filter((b) => b.id !== id);
      this.meta.total = Math.max(0, this.meta.total - 1);
    },

    // Overwrites the entire current database with this backup's snapshot.
    // The backend takes its own safety snapshot before restoring, but the
    // list here is now stale either way (the restored data may include
    // backups created after the point restored to disappearing, and a
    // fresh safety-snapshot row appearing) -- callers should refetch after
    // this resolves rather than trying to patch local state.
    async restoreBackup(id) {
      this.restoringId = id;
      this.error = null;
      this.success = null;
      try {
        const { data } = await axiosInstance.post(`/backups/${id}/restore`);
        this.success = data.message;
        return data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.restoringId = null;
      }
    },
  },
});
