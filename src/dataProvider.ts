import type { DataProvider, GetListParams } from '@refinedev/core'
import { api } from '@/lib/api'
import type {
  SubjectListItem,
  LessonItem,
  CreateLessonRequest,
  UpdateLessonRequest,
  CreateSubjectRequest,
  UpdateSubjectRequest,
  CreateUserByAdminRequest,
  UpdateUserByAdminRequest,
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
    if (resource === 'users') {
      try {
        const { data } = await api.get<User[]>('/users')
        let list = (data ?? []).filter((u) => u.role !== 'admin') as User[]
        const fm = getFiltersMap(filters)
        if (fm.role && fm.role !== 'all') {
          list = list.filter((u) => u.role === fm.role)
        }
        return { data: list as any[], total: list.length }
      } catch {
        return { data: [], total: 0 }
      }
    }
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
    if (resource === 'groups') {
      const { data } = await api.get<import('@/types/api').Group[]>('/groups')
      return { data: (data ?? []) as any[], total: (data ?? []).length }
    }
    if (resource === 'subjects') {
      const params: Record<string, string> = {}
      const fm = getFiltersMap(filters)
      if (fm.groupId) params.groupId = fm.groupId
      if (fm.teacherId) params.teacherId = fm.teacherId
      const { data } = await api.get<SubjectListItem[]>('/subjects', { params })
      return { data: data as any[], total: data.length }
    }
    if (resource === 'schedule') {
      const fm = getFiltersMap(filters)
      const date = fm.date || meta?.date || new Date().toISOString().slice(0, 10)
      const params: Record<string, string> = { date }
      if (fm.groupId) params.groupId = fm.groupId
      if (fm.teacherId) params.teacherId = fm.teacherId
      const { data } = await api.get<LessonItem[]>('/schedule/week', { params })
      return { data: data as any[], total: data.length }
    }
    return { data: [], total: 0 }
  },

  getOne: async ({ resource, id }) => {
    if (resource === 'users') {
      const { data } = await api.get<User>(`/users/${id}`)
      return { data: data as any }
    }
    return { data: {} as any }
  },

  create: async ({ resource, variables }) => {
    if (resource === 'users') {
      const body = { ...variables } as CreateUserByAdminRequest
      if (Array.isArray(body.subjects)) {
        body.subjects = body.subjects
          .filter(
            (s) =>
              s?.name?.trim() &&
              (s.groups?.length || s.groupIds?.length || s.groupId)
          )
          .map((s) => {
            if (s.groups?.length) {
              return { name: s.name!.trim(), groups: s.groups }
            }
            const groupIds = s.groupIds ?? (s.groupId ? [s.groupId] : [])
            if (groupIds.length === 1) return { name: s.name!.trim(), groupId: groupIds[0] }
            return { name: s.name!.trim(), groupIds }
          })
          .filter(Boolean) as CreateUserByAdminRequest['subjects']
      }
      const { data } = await api.post('/users', body)
      return { data: data as any }
    }
    if (resource === 'groups') {
      const payload = {
        course: Number((variables as any).course),
        groupName: String((variables as any).groupName ?? '').trim(),
      }
      const { data } = await api.post('/groups', payload)
      return { data: data as any }
    }
    if (resource === 'subjects') {
      const payload: CreateSubjectRequest = {
        name: String((variables as any).name ?? '').trim(),
        groupId: String((variables as any).groupId),
        teacherId: String((variables as any).teacherId),
      }
      const { data } = await api.post<SubjectListItem>('/subjects', payload)
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
    if (resource === 'users') {
      const body = { ...variables } as UpdateUserByAdminRequest
      if (Array.isArray(body.subjects)) {
        body.subjects = body.subjects
          .filter(
            (s) =>
              s?.name?.trim() &&
              (s.groups?.length || s.groupIds?.length || s.groupId)
          )
          .map((s) => {
            if (s.groups?.length) {
              return { name: s.name!.trim(), groups: s.groups }
            }
            const groupIds = s.groupIds ?? (s.groupId ? [s.groupId] : [])
            if (groupIds.length === 1) return { name: s.name!.trim(), groupId: groupIds[0] }
            return { name: s.name!.trim(), groupIds }
          })
          .filter(Boolean) as CreateUserByAdminRequest['subjects']
      }
      const { data } = await api.patch<User>(`/users/${id}`, body)
      return { data: data as any }
    }
    if (resource === 'subjects') {
      const payload: UpdateSubjectRequest = {}
      if ((variables as any)?.name !== undefined) payload.name = String((variables as any).name).trim()
      if ((variables as any)?.groupId !== undefined) payload.groupId = String((variables as any).groupId)
      if ((variables as any)?.teacherId !== undefined) payload.teacherId = String((variables as any).teacherId)
      const { data } = await api.patch<SubjectListItem>(`/subjects/${id}`, payload)
      return { data: data as any }
    }
    if (resource === 'groups') {
      const payload: Record<string, unknown> = {}
      if ((variables as any)?.course !== undefined) payload.course = Number((variables as any).course)
      if ((variables as any)?.groupName !== undefined) payload.groupName = String((variables as any).groupName).trim()
      const { data } = await api.patch(`/groups/${id}`, payload)
      return { data: data as any }
    }
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
    if (resource === 'users') {
      await api.delete(`/users/${id}`)
      return { data: {} as any }
    }
    if (resource === 'subjects') {
      await api.delete(`/subjects/${id}`)
      return { data: {} as any }
    }
    if (resource === 'schedule') {
      await api.delete(`/schedule/${id}`)
      return { data: {} as any }
    }
    return { data: {} as any }
  },

  getMany: async () => ({ data: [] }),
}
