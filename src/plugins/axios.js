import axios from 'axios'
import Cookies from 'js-cookie'
import router from '@/router'

const token = Cookies.get('token')

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
axios.defaults.headers.common['Content-Type'] = 'multipart/form-data';
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
