import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useClientStore = defineStore("clients", {
  state: () => ({
    // Master Data
    clientsData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    // Full (non-paginated) client list -- for pickers like the Project
    // Create/Edit form's optional "Client" dropdown.
    clients: [],
    clientsAttachmentData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    clientsTaskPivotData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    clientsTaskListData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    clientsTaskScopeData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    clientsTaskPaymentData: {
      items: [],
      meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    },
    statistics: null,
    loading: false,
    error: null,
    success: null,
  }),

  actions: {
    /* ======================= CLIENTS ======================= */
    async fetchAllClient(params = {}) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/clients", { params });
        this.clients = response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchClientPaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/clients/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });
        this.clientsData.items = response.data.data.data;
        this.clientsData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchClientById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/clients/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createClient(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/clients", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateClient(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/clients/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteClient(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/clients/${id}`);
        this.clientsData.items = this.clientsData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Client deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchClientStatistics() {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/clients/statistic");
        this.statistics = response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ======================= CLIENT EVALUATIONS (rating) ======================= */
    async fetchClientEvaluations(clientId) {
      try {
        const response = await axiosInstance.get(`/clients/${clientId}/evaluations`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      }
    },

    async createClientEvaluation(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/client-evaluations", payload);
        this.success = response.data.message;
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteClientEvaluation(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/client-evaluations/${id}`);
        this.success = "Evaluation deleted successfully";
      } catch (error) {
        this.error = handleError(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /* ======================= CLIENTS ATTACHMENT ======================= */
    async fetchClientAttachmentPaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(
          "/client-attachments/all/paginated",
          {
            params: {
              row_per_page: params.per_page || 10,
              search: params.search || "",
            },
          }
        );
        this.clientsAttachmentData.items = response.data.data.data;
        this.clientsAttachmentData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchClientAttachmentById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/client-attachments/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createClientAttachment(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/client-attachments", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateClientAttachment(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/client-attachments/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteClientAttachment(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/client-attachments/${id}`);
        this.clientsAttachmentData.items = this.clientsAttachmentData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Client attachment deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ======================= CLIENTS TASK PIVOT ======================= */
    async fetchClientTaskPivotPaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/client-task-pivot/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });
        this.clientsTaskPivotData.items = response.data.data.data;
        this.clientsTaskPivotData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchClientTaskPivotById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/client-task-pivot/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createClientTaskPivot(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/client-task-pivot", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateClientTaskPivot(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/client-task-pivot/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteClientTaskPivot(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/client-task-pivot/${id}`);
        this.clientsTaskPivotData.items = this.clientsTaskPivotData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Client task pivot deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ======================= CLIENTS TASK LIST ======================= */
    async fetchClientTaskListPaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/client-task-list/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });
        this.clientsTaskListData.items = response.data.data.data;
        this.clientsTaskListData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchClientTaskListById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/client-task-list/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createClientTaskList(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/client-task-list", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateClientTaskList(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/client-task-list/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteClientTaskList(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/client-task-list/${id}`);
        this.clientsTaskListData.items = this.clientsTaskListData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Client task list deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ======================= CLIENTS TASK SCOPE ======================= */
    async fetchClientTaskScopePaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/client-task-scope/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });
        this.clientsTaskScopeData.items = response.data.data.data;
        this.clientsTaskScopeData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchClientTaskScopeById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/client-task-scope/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createClientTaskScope(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/client-task-scope", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateClientTaskScope(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/client-task-scope/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteClientTaskScope(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/client-task-scope/${id}`);
        this.clientsTaskScopeData.items = this.clientsTaskScopeData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Client task scope deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    /* ======================= CLIENTS TASK PAYMENT ======================= */
    async fetchClientTaskPaymentPaginated(params) {
      this.loading = true;
      try {
        const response = await axiosInstance.get("/client-task-payment/all/paginated", {
          params: {
            row_per_page: params.per_page || 10,
            search: params.search || "",
          },
        });
        this.clientsTaskPaymentData.items = response.data.data.data;
        this.clientsTaskPaymentData.meta = response.data.data.meta;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchClientTaskPaymentById(id) {
      this.loading = true;
      try {
        const response = await axiosInstance.get(`/client-task-payment/${id}`);
        return response.data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async createClientTaskPayment(payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.post("/client-task-payment", payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async updateClientTaskPayment(id, payload) {
      this.loading = true;
      try {
        const response = await axiosInstance.put(`/client-task-payment/${id}`, payload);
        this.success = response.data.message;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async deleteClientTaskPayment(id) {
      this.loading = true;
      try {
        await axiosInstance.delete(`/client-task-payment/${id}`);
        this.clientsTaskPaymentData.items = this.clientsTaskPaymentData.items.filter(
          (item) => item.id !== id
        );
        this.success = "Client task payment deleted successfully";
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },
  },
});