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
        if (data.data?.id) {
          this.screening = data.data;
          this.patchListRow(data.data);
        }
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.saving = false;
      }
    },

    // Keeps the list (kept in the store between pages) in step with an edit
    // made on the detail page: the row's fields and the status counts.
    patchListRow(detail) {
      const row = this.screenings.find((r) => r.id === detail.id);
      if (!row) return;
      if (row.status !== detail.status && this.statusCounts) {
        const counts = { ...this.statusCounts };
        if (counts[row.status]) counts[row.status] = Number(counts[row.status]) - 1;
        counts[detail.status] = Number(counts[detail.status] || 0) + 1;
        this.statusCounts = counts;
      }
      for (const key of ["status", "company", "contact_name", "email", "phone", "complexity", "submitted_at"]) {
        if (key in detail) row[key] = detail[key];
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
      const row = this.screenings.find((r) => r.id === id);
      if (row) {
        this.screenings = this.screenings.filter((r) => r.id !== id);
        if (this.statusCounts?.[row.status]) this.statusCounts = { ...this.statusCounts, [row.status]: Number(this.statusCounts[row.status]) - 1 };
        if (this.meta?.total) this.meta = { ...this.meta, total: this.meta.total - 1 };
      }
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
