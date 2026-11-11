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

    // Put the server the API returned into the list (replace by id, or
    // append) -- add/edit/regenerate all return it, so no list refetch.
    upsertServer(server) {
      if (!server?.id) return;
      const i = this.servers.findIndex((s) => s.id === server.id);
      if (i === -1) this.servers = [...this.servers, server];
      else this.servers = this.servers.map((s, j) => (j === i ? { ...s, ...server } : s));
    },

    // Returns { server, token, install_command, uninstall_command }.
    async addServer(payload) {
      const { data } = await axiosInstance.post("/server-monitor/servers", payload);
      if (data.data?.server) this.upsertServer(data.data.server);
      else await this.fetchServers({ silent: true });
      return data.data;
    },

    // Returns the updated server.
    async updateServer(id, payload) {
      const { data } = await axiosInstance.put(`/server-monitor/servers/${id}`, payload);
      if (data.data?.id) this.upsertServer(data.data);
      else await this.fetchServers({ silent: true });
      return data.data;
    },

    // Returns { server, token, install_command, uninstall_command }.
    async regenerateToken(id) {
      const { data } = await axiosInstance.post(`/server-monitor/servers/${id}/regenerate-token`);
      if (data.data?.server) this.upsertServer(data.data.server);
      else await this.fetchServers({ silent: true });
      return data.data;
    },

    async removeServer(id) {
      await axiosInstance.delete(`/server-monitor/servers/${id}`);
      this.servers = this.servers.filter((s) => s.id !== id);
    },
  },
});
