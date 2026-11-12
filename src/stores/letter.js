import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { openBlobPdf } from "@/utils/pdfTab";

// Letter/division codes change rarely (Settings -> Document Codes keeps
// these arrays in step when it adds or removes one), so the letter form
// reuses them for a while instead of refetching on every visit.
const CODES_TTL_MS = 5 * 60 * 1000;
let listSeq = 0;

export const useLetterStore = defineStore("letter", {
  state: () => ({
    letters: [],
    // Params of the list now shown (null until the first load), so a page
    // coming back can show it straight away and refresh quietly.
    listKey: null,
    letterCodes: [],
    divisionCodes: [],
    codesFetchedAt: 0,
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchLetters(params = {}) {
      const seq = ++listSeq;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/letters", {
          params: { row_per_page: 10, ...params },
        });
        // A response that comes back after a newer request is dropped.
        if (seq !== listSeq) return;
        this.letters = data.data.data;
        this.meta = {
          current_page: data.data.current_page,
          last_page: data.data.last_page,
          per_page: data.data.per_page,
          total: data.data.total,
          from: data.data.from,
          to: data.data.to,
        };
        this.listKey = JSON.stringify(params);
      } catch (error) {
        if (seq === listSeq) this.error = handleError(error);
      } finally {
        if (seq === listSeq) this.loading = false;
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

    // Both code lists for the letter form; no request while they're fresh.
    async ensureCodes() {
      if (Date.now() - this.codesFetchedAt < CODES_TTL_MS && this.letterCodes.length && this.divisionCodes.length) return;
      await Promise.all([this.fetchLetterCodes(), this.fetchDivisionCodes()]);
      this.codesFetchedAt = Date.now();
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

    // Puts a saved letter in place in the list (when it's on the page shown).
    patchLetter(letter) {
      if (!letter?.id) return;
      const idx = this.letters.findIndex((l) => l.id === letter.id);
      if (idx !== -1) this.letters[idx] = { ...this.letters[idx], ...letter };
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
        this.patchLetter(data.data);
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async cancelLetter(id) {
      const { data } = await axiosInstance.post(`/letters/${id}/cancel`);
      this.patchLetter(data.data);
      return data.data;
    },

    async deleteLetter(id) {
      await axiosInstance.delete(`/letters/${id}`);
      const before = this.letters.length;
      this.letters = this.letters.filter((l) => l.id !== id);
      if (this.letters.length < before && this.meta.total) {
        this.meta = { ...this.meta, total: this.meta.total - 1, to: this.meta.to ? this.meta.to - 1 : this.meta.to };
      }
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

    // Opens the PDF inline in a new tab (browser's own viewer). Call it
    // straight from the click handler, without awaiting anything first.
    viewPdf(id, tab = window.open("", "_blank")) {
      return openBlobPdf(tab, () => axiosInstance.get(`/letters/${id}/export-pdf`, { responseType: "blob" }));
    },
  },
});
