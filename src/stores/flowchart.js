import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { invalidate } from "@/composables/useStaleFetch";

let listSeq = 0; // latest fetchFlowcharts call
// List rows never carry the diagram itself.
const listRow = ({ data, ...row }) => row; // eslint-disable-line no-unused-vars

export const useFlowchartStore = defineStore("flowchart", {
  state: () => ({
    flowcharts: [],
    // Params (JSON) the list above was fetched with; null before the first load.
    listKey: null,
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
      // Only the latest request writes the list (typing a search can leave
      // an older request in flight).
      const seq = ++listSeq;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/flowcharts", { params });
        if (seq !== listSeq) return;
        this.flowcharts = data.data.data;
        this.meta = data.data.meta;
        this.listKey = JSON.stringify(params);
      } catch (error) {
        if (seq === listSeq) this.error = handleError(error);
      } finally {
        if (seq === listSeq) this.loading = false;
      }
    },

    patchSaved(saved, { isNew = false } = {}) {
      const row = listRow(saved);
      const index = this.flowcharts.findIndex((f) => f.id === row.id);
      if (index !== -1) {
        this.flowcharts.splice(index, 1, { ...this.flowcharts[index], ...row });
        return;
      }
      const params = this.listKey ? JSON.parse(this.listKey) : null;
      if (isNew && params && !params.search && (params.page ?? 1) === 1) {
        const per = this.meta.per_page || 10;
        this.flowcharts = [row, ...this.flowcharts].slice(0, per);
        this.meta = { ...this.meta, total: this.meta.total + 1, last_page: Math.max(1, Math.ceil((this.meta.total + 1) / per)) };
      } else if (this.listKey) {
        invalidate("flowchart-list");
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
        this.patchSaved(data.data, { isNew: true });
        return data.data;
      } finally {
        this.saving = false;
      }
    },

    async updateFlowchart(id, payload) {
      this.saving = true;
      try {
        const { data } = await axiosInstance.put(`/flowcharts/${id}`, payload);
        this.patchSaved(data.data);
        return data.data;
      } finally {
        this.saving = false;
      }
    },

    // Snapshot used when the flowchart is inserted into other documents.
    async uploadPreview(id, blob) {
      const formData = new FormData();
      formData.append("image", blob, `flowchart-${id}.png`);
      const { data } = await axiosInstance.post(`/flowcharts/${id}/preview`, formData);
      // The card shows the new snapshot without a reload.
      const url = data?.data?.preview_url;
      const row = this.flowcharts.find((f) => String(f.id) === String(id));
      if (url && row) row.preview_url = url;
    },

    async deleteFlowchart(id) {
      await axiosInstance.delete(`/flowcharts/${id}`);
      const before = this.flowcharts.length;
      this.flowcharts = this.flowcharts.filter((f) => f.id !== id);
      if (this.flowcharts.length < before) this.meta = { ...this.meta, total: Math.max(0, this.meta.total - 1) };
    },
  },
});
