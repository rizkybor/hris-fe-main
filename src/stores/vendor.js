import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useVendorsStore = defineStore("vendors", {
  state: () => ({
    // Master Data
    vendorsData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    vendorsAttachmentData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    vendorsTaskPivotData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    vendorsTaskListData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    vendorsTaskScopeData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    vendorsTaskPaymentData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    statistics: null,
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    /* ======================= VENDORS ======================= */
    async fetchVendorsPaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/vendors/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });
        this.vendorsData.items = response.data.data.data;
        this.vendorsData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchVendorById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/vendors/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createVendor(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/vendors", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateVendor(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/vendors/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteVendor(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/vendors/${id}`);
        this.vendorsData.items = this.vendorsData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Vendor deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchVendorsStatistics() {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/vendors/statistic");
        this.statistics = response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ======================= VENDORS ATTACHMENT ======================= */
    async fetchVendorsAttachmentPaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(
          "/vendors-attachment/all/paginated",
          {
            params: {
              row_per_page: params.per_page || 10,
              search: params.search || "",
            },
          }
        );
        this.vendorsAttachmentData.items = response.data.data.data;
        this.vendorsAttachmentData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchVendorAttachmentById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/vendors-attachment/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createVendorAttachment(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/vendors-attachment", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateVendorAttachment(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/vendors-attachment/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteVendorAttachment(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/vendors-attachment/${id}`);
        this.vendorsAttachmentData.items = this.vendorsAttachmentData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Vendor attachment deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ======================= VENDORS TASK PIVOT ======================= */
    async fetchVendorsTaskPivotPaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/vendors-task-pivot/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });
        this.vendorsTaskPivotData.items = response.data.data.data;
        this.vendorsTaskPivotData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchVendorsTaskPivotById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/vendors-task-pivot/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createVendorsTaskPivot(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/vendors-task-pivot", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateVendorsTaskPivot(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/vendors-task-pivot/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteVendorsTaskPivot(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/vendors-task-pivot/${id}`);
        this.vendorsTaskPivotData.items = this.vendorsTaskPivotData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Vendor task pivot deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ======================= VENDORS TASK LIST ======================= */
    async fetchVendorsTaskListPaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/vendors-task-list/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });
        this.vendorsTaskListData.items = response.data.data.data;
        this.vendorsTaskListData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchVendorsTaskListById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/vendors-task-list/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createVendorsTaskList(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/vendors-task-list", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateVendorsTaskList(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/vendors-task-list/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteVendorsTaskList(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/vendors-task-list/${id}`);
        this.vendorsTaskListData.items = this.vendorsTaskListData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Vendor task list deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ======================= VENDORS TASK SCOPE ======================= */
    async fetchVendorsTaskScopePaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/vendors-task-scope/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });
        this.vendorsTaskScopeData.items = response.data.data.data;
        this.vendorsTaskScopeData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchVendorsTaskScopeById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/vendors-task-scope/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createVendorsTaskScope(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/vendors-task-scope", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateVendorsTaskScope(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/vendors-task-scope/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteVendorsTaskScope(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/vendors-task-scope/${id}`);
        this.vendorsTaskScopeData.items = this.vendorsTaskScopeData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Vendor task scope deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ======================= VENDORS TASK PAYMENT ======================= */
    async fetchVendorsTaskPaymentPaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/vendors-task-payment/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });
        this.vendorsTaskPaymentData.items = response.data.data.data;
        this.vendorsTaskPaymentData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchVendorsTaskPaymentById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/vendors-task-payment/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createVendorsTaskPayment(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/vendors-task-payment", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateVendorsTaskPayment(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/vendors-task-payment/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteVendorsTaskPayment(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/vendors-task-payment/${id}`);
        this.vendorsTaskPaymentData.items = this.vendorsTaskPaymentData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Vendor task payment deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },
  },
});