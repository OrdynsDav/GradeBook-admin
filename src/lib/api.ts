import axios, { type AxiosInstance } from 'axios'
import { getAccessToken, clearAuth } from './auth'

export const API_BASE_URL = 'https://gradebook-backend-xhw2.onrender.com/api/v1'
/* export const API_BASE_URL = 'http://localhost:3000/api/v1' */

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
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

type ScheduleImportResponse = import('@/types/api').ScheduleImportResponse

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Импорт расписания из Excel: POST /schedule/import
 * Способ 1: multipart/form-data, поле "file" (макс. 10 МБ).
 * Способ 2 (если multipart не доходит): application/json, { "fileBase64": "<base64>" }.
 */
export async function importScheduleFromExcel(
  file: File
): Promise<ScheduleImportResponse> {
  const token = getAccessToken()
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  // Сначала пробуем multipart/form-data
  const formData = new FormData()
  formData.append('file', file)
  let res = await fetch(`${API_BASE_URL}/schedule/import`, {
    method: 'POST',
    headers,
    body: formData,
  })

  // Если 400 и ошибка про формат загрузки — повторяем через JSON + base64
  if (!res.ok && res.status === 400) {
    const errData = await res.json().catch(() => ({}))
    const msg = (errData?.message ?? '') as string
    if (
      msg.toLowerCase().includes('binary') ||
      msg.toLowerCase().includes('multipart') ||
      msg.toLowerCase().includes('invalid file')
    ) {
      const fileBase64 = await fileToBase64(file)
      res = await fetch(`${API_BASE_URL}/schedule/import`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64 }),
      })
    } else {
      throw Object.assign(new Error(errData?.message ?? 'Ошибка импорта'), {
        response: { data: errData },
      })
    }
  }

  if (res.status === 401) {
    clearAuth()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (!res.ok) {
    throw Object.assign(new Error(data?.message ?? 'Ошибка импорта'), { response: { data } })
  }
  return data
}
