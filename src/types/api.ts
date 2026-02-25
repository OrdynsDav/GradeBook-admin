/** Типы для API админ-панели GradeBook */

export type CreatableRole = 'student' | 'teacher'

export interface LoginRequest {
  login: string
  password: string
}

export interface User {
  id: string
  role: 'admin' | 'student' | 'teacher'
  firstName: string
  lastName: string
  middleName?: string
  login: string
  groupId?: string
  /** В ответах GET /users и GET /users/me у студента приходит объект группы */
  group?: Group
  createdAt?: string
  updatedAt?: string
}

export interface Group {
  id: string
  name: string
  course?: number
  groupName?: string
  curatorId?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateGroupRequest {
  course: number
  groupName: string
}

export interface UpdateGroupRequest {
  course?: number
  groupName?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

/** Предмет учителя: по id — groupId (одна) или groupIds (несколько); по названию — groups (массив названий групп, регистр не важен). */
export interface CreateTeacherSubjectItem {
  name: string
  groupId?: string
  groupIds?: string[]
  /** Названия групп, например ["И14-1", "И14-2"] */
  groups?: string[]
}

export interface CreateUserByAdminRequest {
  role: CreatableRole
  firstName: string
  lastName: string
  middleName?: string
  login: string
  password: string
  /** Только для student: курс 1–4 */
  course?: number
  /** Только для student: название группы (например И14-1), 1–32 символа */
  group?: string
  /** Только для teacher: массив предметов (название + группы по id или по названию) */
  subjects?: CreateTeacherSubjectItem[]
}

/** PATCH /users/:id — все поля опциональны */
export interface UpdateUserByAdminRequest {
  role?: CreatableRole
  firstName?: string
  lastName?: string
  middleName?: string
  login?: string
  password?: string
  course?: number
  group?: string
  subjects?: CreateTeacherSubjectItem[]
}

/** Предмет из GET /subjects */
export interface SubjectListItem {
  id: string
  name: string
  groupId: string
  teacherId: string
  group: Group
  teacher: Teacher
  createdAt?: string
  updatedAt?: string
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  middleName?: string
}

export interface SubjectsQueryParams {
  groupId?: string
  teacherId?: string
}

export interface CreateSubjectRequest {
  name: string
  groupId: string
  teacherId: string
}

export interface UpdateSubjectRequest {
  name?: string
  groupId?: string
  teacherId?: string
}

/** Урок в расписании */
export interface LessonItem {
  id: string
  startsAt: string
  endsAt: string
  room?: string | null
  subject: { id: string; name: string }
  group: Group
  teacher: Teacher
}

export interface CreateLessonRequest {
  subjectId: string
  startsAt: string
  endsAt: string
  room?: string
}

export interface UpdateLessonRequest {
  subjectId?: string
  startsAt?: string
  endsAt?: string
  room?: string
}

export interface ScheduleQueryParams {
  date: string // YYYY-MM-DD
  groupId?: string
  teacherId?: string
}

/** Ответ POST /schedule/import (импорт из Excel) */
export interface ScheduleImportResponse {
  created: number
  skipped: number
  errors: string[]
}

export interface ApiError {
  statusCode: number
  message: string
  error?: string
}
