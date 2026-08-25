import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { handleError } from "@/helpers/errorHelper";

// The axios instance defaults Content-Type to multipart/form-data (see
// plugins/axios.js) for file-upload endpoints; a plain JSON body sent under
// that header can't be parsed by Laravel at all, so writes here must
// override it explicitly.
const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

export const useAnnouncementStore = defineStore("announcement", {
    state: () => ({
        announcements: [],
        meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
        loading: false,
        loadingDetail: false,
        error: null,
        success: null,
    }),

    actions: {
        async fetchAnnouncements(params = {}) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.get("/announcements", { params });

                this.announcements = response.data.data?.data ?? [];
                this.meta = response.data.data?.meta ?? this.meta;
            } catch (error) {
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async fetchAnnouncement(id) {
            this.loadingDetail = true;
            this.error = null;

            try {
                const response = await axiosInstance.get(`/announcements/${id}`);

                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loadingDetail = false;
            }
        },

        async createAnnouncement(payload) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.post("/announcements", payload, JSON_HEADERS);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async updateAnnouncement(id, payload) {
            this.loading = true;
            this.error = null;

            try {
                const response = await axiosInstance.put(`/announcements/${id}`, payload, JSON_HEADERS);

                this.success = response.data.message;
                return response.data.data;
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async deleteAnnouncement(id) {
            this.loading = true;
            this.error = null;

            try {
                await axiosInstance.delete(`/announcements/${id}`);

                this.announcements = this.announcements.filter((a) => a.id !== id);
            } catch (error) {
                this.error = handleError(error);
                throw error;
            } finally {
                this.loading = false;
            }
        },
    },
});
