import { defineStore } from "pinia";
import axios from "axios";
import { ref } from "vue";

export const useCompanyAboutStore = defineStore("companyAbout", () => {
  const company = ref(null); // Hanya satu company
  const loading = ref(false);
  const success = ref(null);
  const error = ref(null);

  // GET: Fetch company (mengambil data pertama)
  const fetchCompany = async () => {
    loading.value = true;
    success.value = null;
    error.value = null;
    try {
      const { data } = await axios.get("/company-about");
      // Ambil data pertama jika ada, atau null
      company.value = data.data?.[0] || null;
    } catch (err) {
      console.error(err);
      error.value = err.response?.data?.message || err.message;
      company.value = null;
    } finally {
      loading.value = false;
    }
  };

  // GET by ID
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

  // POST: Create
  const createCompany = async (payload) => {
    loading.value = true;
    try {
      const { data } = await axios.post("/company-about", payload);
      company.value = data.data;
      success.value = "Company created successfully!";
    } catch (err) {
      console.error(err);
      error.value = err.response?.data?.message || err.message;
    } finally {
      loading.value = false;
    }
  };

  // PUT: Update
  const updateCompany = async (id, payload) => {
    loading.value = true;
    try {
      const { data } = await axios.put(`/company-about/${id}`, payload);
      company.value = data.data;
      success.value = "Company updated successfully!";
    } catch (err) {
      console.error(err);
      error.value = err.response?.data?.message || err.message;
    } finally {
      loading.value = false;
    }
  };

  // DELETE: Delete
  const deleteCompany = async (id) => {
    loading.value = true;
    try {
      await axios.delete(`/company-about/${id}`);
      company.value = null;
      success.value = "Company deleted successfully!";
    } catch (err) {
      console.error(err);
      error.value = err.response?.data?.message || err.message;
    } finally {
      loading.value = false;
    }
  };

  return {
    company,
    loading,
    success,
    error,
    fetchCompany,
    fetchCompanyById,
    createCompany,
    updateCompany,
    deleteCompany,
  };
});
