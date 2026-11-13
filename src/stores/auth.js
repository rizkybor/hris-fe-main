import { handleError } from "@/helpers/errorHelper";
import { toRequestBody } from "@/helpers/formDataHelper";
import { axiosInstance } from "@/plugins/axios";
import Cookies from "js-cookie";
import { defineStore } from "pinia";
import router from "@/router";

const MIN_LOADING_MS = 900;
// Sign-in shows the butterfly loader a little longer so it gets to beat its
// wings a few times (ButterflyLoader.vue).
const MIN_LOGIN_LOADING_MS = 1800;
const withMinDuration = (promise, ms = MIN_LOADING_MS) => {
    const timer = new Promise((resolve) => setTimeout(resolve, ms));
    return Promise.allSettled([promise, timer]).then(([result]) => {
        if (result.status === 'rejected') throw result.reason;
        return result.value;
    });
};

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null,
        token: Cookies.get('token') || null,
        loading: false,
        error: null,
        success: null,
    }),
    getters: {
        isAuthenticated: (state) => !!state.user,
    },
    actions: {
        async login(credentials) {
            this.loading = true
            this.error = null

            try {
                const response = await withMinDuration(axiosInstance.post('/login', credentials), MIN_LOGIN_LOADING_MS)

                const token = response.data.data.token

                // Secure on https, and never sent with cross-site requests.
                Cookies.set('token', token, { secure: window.location.protocol === 'https:', sameSite: 'strict' })
                this.token = token

                this.success = response.data.message

                // Each sign-in starts the sidebar from its default open sections
                // (see Sidebar.vue); changes made during the session are kept.
                try { localStorage.removeItem('sidebar-collapsed-sections') } catch { /* storage unavailable */ }
                router.push({ name: 'admin.dashboard' })
            } catch (error) {
                this.error = handleError(error)
            } finally {
                this.loading = false
            }
        },

        async forgotPassword(email) {
            this.loading = true
            this.error = null
            this.success = null

            try {
                const response = await withMinDuration(axiosInstance.post('/forgot-password', { email }))
                this.success = response.data.message
            } catch (error) {
                this.error = handleError(error)
                throw error
            } finally {
                this.loading = false
            }
        },

        async resetPassword(payload) {
            this.loading = true
            this.error = null
            this.success = null

            try {
                const response = await withMinDuration(axiosInstance.post('/reset-password', payload))
                this.success = response.data.message
            } catch (error) {
                this.error = handleError(error)
                throw error
            } finally {
                this.loading = false
            }
        },

        async checkAuth() {
            this.loading = true;
            try {
                const response = await axiosInstance.get('/me');
                this.user = response.data.data;
                return this.user;
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    Cookies.remove('token');
                    this.token = null;
                    throw new Error("Unauthorized");
                }
                this.error = handleError(error);
            } finally {
                this.loading = false;
            }
        },

        async logout() {
            this.loading = true

            try {
                await axiosInstance.post('/logout')

                Cookies.remove('token')
                this.token = null

                this.user = null
                this.error = null

                window.location.assign(router.resolve({ name: 'login' }).href)
            } catch (error) {
                this.error = handleError(error)
            } finally {
                this.loading = false
            }
        },

        async updateProfile(payload) {
            this.loading = true
            this.error = null
            this.success = null

            try {
                const response = await axiosInstance.post('/me', toRequestBody({
                    ...payload,
                    _method: 'PUT',
                }))

                this.success = response.data.message || 'Profile updated successfully'
                // refresh user
                await this.checkAuth()
                return response.data.data
            } catch (error) {
                this.error = handleError(error)
            } finally {
                this.loading = false
            }
        }
    }
})