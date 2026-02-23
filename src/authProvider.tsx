import type { AuthProvider } from '@refinedev/core'
import { api } from '@/lib/api'
import { clearAuth, getAccessToken, getUser, setAccessToken, setRefreshToken, setUser } from '@/lib/auth'
import type { AuthResponse, LoginRequest } from '@/types/api'

export const authProvider: AuthProvider = {
  login: async ({ login, password }: { login: string; password: string }) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        login,
        password,
      } as LoginRequest)
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      setUser(data.user)
      if (data.user.role !== 'admin') {
        clearAuth()
        return {
          success: false,
          error: Object.assign(new Error('Доступ только для администратора'), { message: 'Доступ только для администратора' }),
        }
      }
      return { success: true, redirectTo: '/' }
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Ошибка входа'
      return { success: false, error: Object.assign(new Error(message), { message }) }
    }
  },

  logout: async () => {
    clearAuth()
    return { success: true, redirectTo: '/login' }
  },

  check: async () => {
    const token = getAccessToken()
    if (!token) {
      return { authenticated: false, redirectTo: '/login', logout: true }
    }
    return { authenticated: true }
  },

  onError: async (error) => {
    if (error?.response?.status === 401) {
      return { logout: true, redirectTo: '/login' }
    }
    return {}
  },

  getIdentity: async () => getUser(),
}
