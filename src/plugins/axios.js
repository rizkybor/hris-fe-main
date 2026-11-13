import axios from 'axios'
import Cookies from 'js-cookie'
import router from '@/router'

const token = Cookies.get('token')

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
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

axios.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401 && router.currentRoute.value.name !== 'login') {
            Cookies.remove('token')
            // Dynamic import avoids a circular dependency: stores/auth.js
            // imports axiosInstance from this file.
            const { useAuthStore } = await import('@/stores/auth')
            useAuthStore().$reset()
            // Full reload (not router.push): drops all cached store data of
            // the expired session before someone signs in again.
            window.location.assign(router.resolve({ name: 'login' }).href)
        }

        return Promise.reject(error)
    },
)

export const axiosInstance = axios
