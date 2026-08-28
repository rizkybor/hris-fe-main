import { handleError } from "@/helpers/errorHelper";
import { axiosInstance } from "@/plugins/axios";
import Cookies from "js-cookie";
import { defineStore } from "pinia";
import router from "@/router";

// Keeps the loading overlay visible for at least `ms`, even when the
// request itself resolves faster -- otherwise it flashes for a few
// milliseconds and the user can't tell it's actually there.
const MIN_LOADING_MS = 900;
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
        // Kept in reactive state (not derived via a getter) and synced
        // explicitly wherever the cookie changes. A getter like
        // `token: () => Cookies.get('token')` gets treated by Pinia as a
        // computed(): since document.cookie isn't a reactive dependency,
        // Vue caches the first read forever and never re-evaluates it, so
        // a token set after that first (empty) read is invisible to
        // anything reading authStore.token -- e.g. the very first login of
        // a fresh session, where the router guard reads an empty token
        // before login, then never sees the freshly-set one after.
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
                const response = await withMinDuration(axiosInstance.post('/login', credentials))

                const token = response.data.data.token

                Cookies.set('token', token)
                this.token = token

                this.success = response.data.message

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

                router.push({ name: 'login' })
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
                const response = await axiosInstance.post('/me', {
                    ...payload,
                    _method: 'PUT',
                })

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