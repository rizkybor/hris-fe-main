import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useLetterStore = defineStore("letter", {
  state: () => ({
    letters: [],
    letterCodes: [],
    divisionCodes: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchLetters(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/letters", {
          params: { row_per_page: 10, ...params },
        });
        this.letters = data.data.data;
        this.meta = {
          current_page: data.data.current_page,
          last_page: data.data.last_page,
          per_page: data.data.per_page,
          total: data.data.total,
        };
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchLetter(id) {
      const { data } = await axiosInstance.get(`/letters/${id}`);
      return data.data;
    },

    async fetchLetterCodes() {
      const { data } = await axiosInstance.get("/letter-codes");
      this.letterCodes = data.data;
    },

    async fetchDivisionCodes() {
      const { data } = await axiosInstance.get("/division-codes");
      this.divisionCodes = data.data;
    },

    async createLetterCode(payload) {
      const { data } = await axiosInstance.post("/letter-codes", payload);
      this.letterCodes.push(data.data);
      return data.data;
    },

    async deleteLetterCode(id) {
      await axiosInstance.delete(`/letter-codes/${id}`);
      this.letterCodes = this.letterCodes.filter((c) => c.id !== id);
    },

    async createDivisionCode(payload) {
      const { data } = await axiosInstance.post("/division-codes", payload);
      this.divisionCodes.push(data.data);
      return data.data;
    },

    async deleteDivisionCode(id) {
      await axiosInstance.delete(`/division-codes/${id}`);
      this.divisionCodes = this.divisionCodes.filter((c) => c.id !== id);
    },

    async createLetter(payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/letters", payload);
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async updateLetter(id, payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.put(`/letters/${id}`, payload);
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async cancelLetter(id) {
      const { data } = await axiosInstance.post(`/letters/${id}/cancel`);
      const idx = this.letters.findIndex((l) => l.id === id);
      if (idx !== -1) this.letters[idx] = data.data;
    },

    async deleteLetter(id) {
      await axiosInstance.delete(`/letters/${id}`);
      this.letters = this.letters.filter((l) => l.id !== id);
    },

    async downloadPdf(id, number) {
      const response = await axiosInstance.get(`/letters/${id}/export-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${(number || "letter").replace(/\//g, "-")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },

    // Opens the PDF inline in a new tab (browser's own viewer) instead of
    // forcing a save-as -- the API route needs an auth header, so this
    // can't just be a plain <a href> to the endpoint like a public file.
    async viewPdf(id) {
      const response = await axiosInstance.get(`/letters/${id}/export-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      window.open(url, "_blank");
    },
  },
});
