import type { DataProvider, GetListParams } from '@refinedev/core'
import { api } from '@/lib/api'
import type {
  SubjectListItem,
  LessonItem,
  CreateLessonRequest,
  UpdateLessonRequest,
  CreateUserByAdminRequest,
  User,
  Teacher,
} from '@/types/api'

const BASE = 'https://gradebook-backend-xhw2.onrender.com/api/v1'

function getFiltersMap(filters?: GetListParams['filters']) {
  const map: Record<string, string> = {}
  if (!filters) return map
  for (const f of filters) {
    if ('field' in f && 'value' !== undefined) {
      map[f.field] = f.value as string
    }
  }
  return map
}

export const dataProvider: DataProvider = {
  getApiUrl: () => BASE,

  getList: async ({ resource, filters, meta }) => {
    if (resource === 'teachers') {
      try {
        const { data } = await api.get<User[]>('/users')
        const teachers = (data ?? [])
          .filter((u) => u.role === 'teacher')
          .map((u): Teacher => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            middleName: u.middleName,
          }))
        return { data: teachers as any[], total: teachers.length }
      } catch {
        return { data: [], total: 0 }
      }
    }
    if (resource === 'subjects') {
      const params: Record<string, string> = {}
      const fm = getFiltersMap(filters)
      if (fm.classRoomId) params.classRoomId = fm.classRoomId
      if (fm.teacherId) params.teacherId = fm.teacherId
      const { data } = await api.get<SubjectListItem[]>('/subjects', { params })
      return { data: data as any[], total: data.length }
    }
    if (resource === 'schedule') {
      const fm = getFiltersMap(filters)
      const date = fm.date || meta?.date || new Date().toISOString().slice(0, 10)
      const params: Record<string, string> = { date }
      if (fm.classRoomId) params.classRoomId = fm.classRoomId
      if (fm.teacherId) params.teacherId = fm.teacherId
      const { data } = await api.get<LessonItem[]>('/schedule/week', { params })
      return { data: data as any[], total: data.length }
    }
    return { data: [], total: 0 }
  },

  getOne: async () => {
    // API не отдаёт один урок по id; для редактирования урок берётся из списка
    return { data: {} as any }
  },

  create: async ({ resource, variables }) => {
    if (resource === 'users') {
      const { data } = await api.post('/users', variables as CreateUserByAdminRequest)
      return { data: data as any }
    }
    if (resource === 'schedule') {
      const payload: CreateLessonRequest = {
        subjectId: (variables as any).subjectId,
        startsAt: (variables as any).startsAt,
        endsAt: (variables as any).endsAt,
        room: (variables as any).room,
      }
      const { data } = await api.post<LessonItem>('/schedule', payload)
      return { data: data as any }
    }
    return { data: {} as any }
  },

  update: async ({ resource, id, variables }) => {
    if (resource === 'schedule') {
      const payload: UpdateLessonRequest = {
        subjectId: (variables as any)?.subjectId,
        startsAt: (variables as any)?.startsAt,
        endsAt: (variables as any)?.endsAt,
        room: (variables as any)?.room,
      }
      const { data } = await api.patch<LessonItem>(`/schedule/${id}`, payload)
      return { data: data as any }
    }
    return { data: {} as any }
  },

  deleteOne: async ({ resource, id }) => {
    if (resource === 'schedule') {
      await api.delete(`/schedule/${id}`)
      return { data: {} as any }
    }
    return { data: {} as any }
  },

  getMany: async () => ({ data: [] }),
}
