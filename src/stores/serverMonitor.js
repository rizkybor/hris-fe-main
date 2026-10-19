import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { errorMessage } from "@/helpers/errorHelper";

// VPSes reporting through the HRIS server agent (Insights > Server Storage).
export const useServerMonitorStore = defineStore("serverMonitor", {
  state: () => ({
    servers: [],
    loading: false,
    loaded: false,
    error: null,
  }),

  actions: {
    async fetchServers({ silent = false } = {}) {
      if (!silent) this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/server-monitor/servers");
        this.servers = data.data;
        this.loaded = true;
      } catch (error) {
        this.error = errorMessage(error, "Daftar VPS tidak bisa dimuat.");
      } finally {
        this.loading = false;
      }
    },

    // Returns { server, token, install_command, uninstall_command }.
    async addServer(payload) {
      const { data } = await axiosInstance.post("/server-monitor/servers", payload);
      await this.fetchServers({ silent: true });
      return data.data;
    },

    async updateServer(id, payload) {
      const { data } = await axiosInstance.put(`/server-monitor/servers/${id}`, payload);
      await this.fetchServers({ silent: true });
      return data.data;
    },

    async regenerateToken(id) {
      const { data } = await axiosInstance.post(`/server-monitor/servers/${id}/regenerate-token`);
      await this.fetchServers({ silent: true });
      return data.data;
    },

    async removeServer(id) {
      await axiosInstance.delete(`/server-monitor/servers/${id}`);
      this.servers = this.servers.filter((s) => s.id !== id);
    },
  },
});
