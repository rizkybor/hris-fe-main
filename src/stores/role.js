import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useRoleStore = defineStore("role", {
  state: () => ({
    roles: [],
    permissionGroups: [],
    currentRole: null,
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchRoles() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/roles");
        this.roles = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchPermissions() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/permissions");
        this.permissionGroups = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchRole(id) {
      try {
        const { data } = await axiosInstance.get(`/roles/${id}`);
        this.currentRole = data.data;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async createRole(payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/roles", payload, {
          headers: { "Content-Type": "application/json" },
        });
        this.roles.unshift(data.data);
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateRole(id, payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.put(`/roles/${id}`, payload, {
          headers: { "Content-Type": "application/json" },
        });
        const index = this.roles.findIndex((r) => r.id === id);
        if (index !== -1) this.roles[index] = data.data;
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteRole(id) {
      this.error = null;
      try {
        const { data } = await axiosInstance.delete(`/roles/${id}`);
        this.roles = this.roles.filter((r) => r.id !== id);
        this.success = data.message;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },
  },
});
