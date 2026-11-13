import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";
import { openBlobPdf } from "@/utils/pdfTab";

let listSeq = 0;

const filenameFromDisposition = (disposition, fallback) => {
  if (!disposition) return fallback;
  const match = disposition.match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
};

export const useCertificateStore = defineStore("certificate", {
  state: () => ({
    certificates: [],
    // Params of the list now shown (null until the first load).
    listKey: null,
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    statistics: { total_certificates: 0, total_batches: 0, this_month: 0 },
    statisticsLoaded: false,
    settings: { company_code: "", number_format: "" },
    templates: [],
    templatesLoaded: false,
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchCertificates(params = {}) {
      const seq = ++listSeq;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/certificates", {
          params: { row_per_page: 10, ...params },
        });
        // A response that comes back after a newer request is dropped.
        if (seq !== listSeq) return;
        this.certificates = data.data.data;
        this.meta = data.data.meta;
        this.listKey = JSON.stringify(params);
      } catch (error) {
        if (seq === listSeq) this.error = handleError(error);
      } finally {
        if (seq === listSeq) this.loading = false;
      }
    },

    async fetchCertificate(id) {
      const { data } = await axiosInstance.get(`/certificates/${id}`);
      return data.data;
    },

    async fetchStatistics() {
      const { data } = await axiosInstance.get("/certificates/statistics");
      this.statistics = data.data;
      this.statisticsLoaded = true;
    },

    async fetchSettings() {
      const { data } = await axiosInstance.get("/certificate-setting");
      this.settings = data.data;
    },

    async updateSettings(payload) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/certificate-setting", { ...payload, _method: "PUT" });
        this.settings = data.data;
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async fetchTemplates() {
      const { data } = await axiosInstance.get("/certificate-templates");
      this.templates = data.data;
      this.templatesLoaded = true;
    },

    // For pickers: the list Settings keeps in step (create/delete update
    // it), so it's fetched once per session.
    async ensureTemplates() {
      if (!this.templatesLoaded) await this.fetchTemplates();
    },

    async createTemplate(formData) {
      this.error = null;
      try {
        const { data } = await axiosInstance.post("/certificate-templates", formData);
        this.templates.unshift(data.data);
        this.success = data.message;
        return data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async deleteTemplate(id) {
      await axiosInstance.delete(`/certificate-templates/${id}`);
      this.templates = this.templates.filter((t) => t.id !== id);
    },

    async previewNumber({ category_code, program_code }) {
      const { data } = await axiosInstance.post("/certificates/preview-number", {
        category_code,
        program_code,
      });
      return data.data;
    },

    async generate(payload) {
      this.error = null;
      try {
        const response = await axiosInstance.post("/certificates/generate", payload, {
          responseType: "blob",
        });
        const contentType = response.headers["content-type"] || "";
        const isZip = contentType.includes("zip");
        const filename = filenameFromDisposition(
          response.headers["content-disposition"],
          isZip ? "certificates.zip" : "certificate.pdf"
        );
        const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return { isZip, filename };
      } catch (error) {
        // The error body is also a blob when responseType is "blob" -- decode
        // it back to JSON so handleError can read the real validation message.
        if (error?.response?.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            error.response.data = JSON.parse(text);
          } catch {
            // fall through with the original error
          }
        }
        this.error = handleError(error);
        throw error;
      }
    },

    async downloadCertificate(id, number) {
      const response = await axiosInstance.get(`/certificates/${id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${(number || "certificate").replace(/\//g, "-")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },

    // Opens the certificate PDF in the browser's own viewer in a new tab.
    // Call it straight from the click handler, without awaiting first.
    viewPdf(id, tab = window.open("", "_blank")) {
      return openBlobPdf(tab, () => axiosInstance.get(`/certificates/${id}/download`, { responseType: "blob" }));
    },

    async deleteCertificate(id) {
      await axiosInstance.delete(`/certificates/${id}`);
      const before = this.certificates.length;
      this.certificates = this.certificates.filter((c) => c.id !== id);
      if (this.certificates.length < before && this.meta?.total) {
        this.meta = { ...this.meta, total: this.meta.total - 1, to: this.meta.to ? this.meta.to - 1 : this.meta.to };
      }
    },
  },
});
