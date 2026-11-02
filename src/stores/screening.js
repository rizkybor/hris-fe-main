import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

// Client Screening: needs questionnaires, their recommended items, and the
// settings behind them (service catalog synced from the Rate Card, template).
export const useScreeningStore = defineStore("screening", {
  state: () => ({
    screenings: [],
    meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    statusCounts: {},
    screening: null,
    loading: false,
    saving: false,
    error: null,
  }),

  actions: {
    async fetchScreenings(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/screenings", { params });
        this.screenings = data.data.data;
        this.meta = data.data.meta;
        this.statusCounts = data.data.status_counts || {};
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchScreening(id) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get(`/screenings/${id}`);
        this.screening = data.data;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // The calls below all return the updated screening detail.
    async mutate(request) {
      this.saving = true;
      this.error = null;
      try {
        const { data } = await request();
        if (data.data?.id) this.screening = data.data;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.saving = false;
      }
    },

    createScreening(payload) {
      return this.mutate(() => axiosInstance.post("/screenings", payload));
    },
    updateScreening(id, payload) {
      return this.mutate(() => axiosInstance.put(`/screenings/${id}`, payload));
    },
    recalculate(id) {
      return this.mutate(() => axiosInstance.post(`/screenings/${id}/recalculate`));
    },
    saveItems(id, items) {
      return this.mutate(() => axiosInstance.put(`/screenings/${id}/items`, { items }));
    },
    createInvite(id, lang) {
      return this.mutate(() => axiosInstance.post(`/screenings/${id}/invite`, { lang }));
    },
    async deleteScreening(id) {
      await axiosInstance.delete(`/screenings/${id}`);
    },

    async downloadPdf(screening, withPrices) {
      const response = await axiosInstance.get(`/screenings/${screening.id}/pdf`, {
        params: { prices: withPrices ? 1 : 0 },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      const name = (screening.company || screening.contact_name || "klien").replace(/[^\w-]+/g, "-");
      link.setAttribute("download", `Ringkasan-Kebutuhan-${screening.code}-${name}${withPrices ? "-internal" : ""}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  },
});
