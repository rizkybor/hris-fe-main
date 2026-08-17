import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

const filenameFromDisposition = (disposition, fallback) => {
  if (!disposition) return fallback;
  const match = disposition.match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
};

export const useCertificateStore = defineStore("certificate", {
  state: () => ({
    certificates: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    statistics: { total_certificates: 0, total_batches: 0, this_month: 0 },
    settings: { company_code: "", number_format: "" },
    templates: [],
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    async fetchCertificates(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/certificates", {
          params: { row_per_page: 10, ...params },
        });
        this.certificates = data.data.data;
        this.meta = data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchCertificate(id) {
      const { data } = await axiosInstance.get(`/certificates/${id}`);
      return data.data;
    },

    async fetchStatistics() {
      const { data } = await axiosInstance.get("/certificates/statistics");
      this.statistics = data.data;
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

    // The generate endpoint streams a raw file (PDF for a single recipient,
    // ZIP for bulk) rather than JSON, so it must be requested as a blob and
    // the resulting file triggered as a download manually.
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

    async deleteCertificate(id) {
      await axiosInstance.delete(`/certificates/${id}`);
      this.certificates = this.certificates.filter((c) => c.id !== id);
    },
  },
});
