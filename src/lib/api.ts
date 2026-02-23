import axios, { type AxiosInstance } from 'axios'
import { getAccessToken, clearAuth } from './auth'

export const API_BASE_URL = 'https://gradebook-backend-xhw2.onrender.com/api/v1'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)
