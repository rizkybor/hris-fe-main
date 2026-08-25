import axios from 'axios'
import Cookies from 'js-cookie'
import router from '@/router'

const token = Cookies.get('token')

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
// Deliberately no default Content-Type here. A plain object body needs
// 'application/json' (which axios sets automatically); a FormData body
// (real file uploads) needs the browser to generate its own
// 'multipart/form-data; boundary=...' -- which only happens when this
// header is left unset. Forcing a fixed 'multipart/form-data' string here
// broke every plain-JSON request in the app (Laravel can't parse a JSON
// body sent under a boundary-less multipart header) while providing no
// benefit to real uploads, which already set their own Content-Type
// per-request. See stores/dashboardWidgets.js and stores/announcement.js
// for two confirmed, previously-silent casualties of this default.
axios.defaults.headers.common['Accept'] = 'application/json'
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

axios.interceptors.request.use(
    config => {
        const token = Cookies.get('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
)

// A 401 means the token is missing/expired/revoked. Individual pages only
// show a generic error for this, leaving the UI stuck in a logged-in-looking
// but broken state -- so handle it globally: drop the stale token and bounce
// to login, unless we're already there (e.g. a failed login attempt itself).
axios.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401 && router.currentRoute.value.name !== 'login') {
            Cookies.remove('token')
            // Dynamic import avoids a circular dependency: stores/auth.js
            // imports axiosInstance from this file.
            const { useAuthStore } = await import('@/stores/auth')
            useAuthStore().$reset()
            router.push({ name: 'login' })
        }

        return Promise.reject(error)
    },
)

export const axiosInstance = axios
