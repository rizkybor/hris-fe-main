import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useFlowchartStore = defineStore("flowchart", {
  state: () => ({
    flowcharts: [],
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 0,
    },
    loading: false,
    saving: false,
    error: null,
  }),

  actions: {
    async fetchFlowcharts(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/flowcharts", { params });
        this.flowcharts = data.data.data;
        this.meta = data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchFlowchart(id) {
      const { data } = await axiosInstance.get(`/flowcharts/${id}`);
      return data.data;
    },

    async createFlowchart(payload) {
      this.saving = true;
      try {
        const { data } = await axiosInstance.post("/flowcharts", payload);
        return data.data;
      } finally {
        this.saving = false;
      }
    },

    async updateFlowchart(id, payload) {
      this.saving = true;
      try {
        const { data } = await axiosInstance.put(`/flowcharts/${id}`, payload);
        return data.data;
      } finally {
        this.saving = false;
      }
    },

    async deleteFlowchart(id) {
      await axiosInstance.delete(`/flowcharts/${id}`);
      this.flowcharts = this.flowcharts.filter((f) => f.id !== id);
    },
  },
});
