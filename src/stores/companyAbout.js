import { defineStore } from "pinia";
import axios from "axios";
import { ref } from "vue";

export const useCompanyAboutStore = defineStore("companyAbout", () => {
  const company = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // GET: the first company record. `quiet` keeps what's shown while it loads.
  const fetchCompany = async ({ quiet = false } = {}) => {
    if (!quiet || !company.value) loading.value = true;
    error.value = null;
    try {
      const { data } = await axios.get("/company-about");
      company.value = data.data?.[0] || null;
    } catch (err) {
      console.error(err);
      error.value = err.response?.data?.message || err.message;
      if (!quiet) company.value = null;
    } finally {
      loading.value = false;
    }
  };

  const fetchCompanyById = async (id) => {
    loading.value = true;
    try {
      const { data } = await axios.get(`/company-about/${id}`);
      company.value = data.data;
    } catch (err) {
      console.error(err);
      error.value = err.response?.data?.message || err.message;
    } finally {
      loading.value = false;
    }
  };

  const createCompany = async (payload) => {
    const { data } = await axios.post("/company-about", payload, { headers: { "Content-Type": "application/json" } });
    company.value = data.data ?? company.value;
    return company.value;
  };

  const updateCompany = async (id, payload) => {
    const { data } = await axios.put(`/company-about/${id}`, payload, { headers: { "Content-Type": "application/json" } });
    company.value = data.data ?? company.value;
    return company.value;
  };

  const deleteCompany = async (id) => {
    await axios.delete(`/company-about/${id}`);
    company.value = null;
  };

  return {
    company,
    loading,
    error,
    fetchCompany,
    fetchCompanyById,
    createCompany,
    updateCompany,
    deleteCompany,
  };
});
