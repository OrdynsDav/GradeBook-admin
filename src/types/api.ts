/** Типы для API админ-панели GradeBook (соответствие документации API) */

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

/** Группа: GET /groups, GET /groups/:id */
export interface Group {
  id: string
  name: string
  course?: number
  groupName?: string
  curatorId?: string | null
  createdAt?: string
  updatedAt?: string
}

/** Алиас для совместимости с докой (GroupListItem) */
export type GroupListItem = Group

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

/** Предмет: GET /subjects, GET /subjects/:id */
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

/** Учитель (вложенный в предмет/урок и из GET /users по role=teacher) */
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

/** Урок: GET /schedule/day, GET /schedule/week, GET /schedule/:id, POST/PATCH ответы */
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

/** GET /schedule/day, /schedule/week — query-параметры */
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

/** Оценки: GET /subjects/:id/grades */
export interface GradeItem {
  id: string
  subjectId: string
  studentId: string
  value: number
  comment?: string | null
  gradedAt: string
  createdAt?: string
  updatedAt?: string
  student?: Pick<User, 'id' | 'firstName' | 'lastName' | 'middleName' | 'groupId'>
  subject?: Pick<SubjectListItem, 'id' | 'name' | 'teacherId' | 'groupId'>
  teacher?: Teacher
}

/** POST /subjects/:id/grades */
export interface CreateGradeRequest {
  studentId: string
  value: number
  comment?: string
  gradedAt?: string
  /**
   * Для admin: опционально поставить оценку от имени конкретного преподавателя.
   * Поле поддерживается backend-ом при соответствующей реализации.
   */
  teacherId?: string
}

/** PATCH /grades/:id */
export interface UpdateGradeRequest {
  value?: number
  comment?: string
  gradedAt?: string
  teacherId?: string
}
