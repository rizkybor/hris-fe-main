import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

export const useNotificationStore = defineStore("notification", {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchNotifications(limit = 10) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axiosInstance.get("/notifications", { params: { limit } });
        this.notifications = data.data;
      } catch (error) {
        this.error = handleError(error);
      } finally {
        this.loading = false;
      }
    },

    async fetchUnreadCount() {
      try {
        const { data } = await axiosInstance.get("/notifications/unread-count");
        this.unreadCount = data.data.count;
      } catch (error) {
        this.error = handleError(error);
      }
    },

    async markAsRead(id) {
      try {
        await axiosInstance.post(`/notifications/${id}/read`);
        const notification = this.notifications.find((n) => n.id === id);
        if (notification && !notification.read_at) {
          notification.read_at = new Date().toISOString();
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      } catch (error) {
        this.error = handleError(error);
      }
    },

    async markAllAsRead() {
      try {
        await axiosInstance.post("/notifications/mark-all-read");
        this.notifications.forEach((n) => {
          if (!n.read_at) n.read_at = new Date().toISOString();
        });
        this.unreadCount = 0;
      } catch (error) {
        this.error = handleError(error);
      }
    },
  },
});
