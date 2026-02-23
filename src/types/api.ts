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
  classRoom?: ClassRoom
}

export interface ClassRoom {
  id: string
  name: string
  course?: number
  groupName?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

export interface CreateUserByAdminRequest {
  role: CreatableRole
  firstName: string
  lastName: string
  middleName?: string
  login: string
  password: string
  /** Только для student */
  course?: number
  /** Только для student */
  group?: string
}

/** Предмет из GET /subjects */
export interface SubjectListItem {
  id: string
  name: string
  classRoomId: string
  teacherId: string
  classRoom: ClassRoom
  teacher: Teacher
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  middleName?: string
}

export interface SubjectsQueryParams {
  classRoomId?: string
  teacherId?: string
}

/** Урок в расписании */
export interface LessonItem {
  id: string
  startsAt: string
  endsAt: string
  room?: string
  subject: { id: string; name: string }
  classRoom: ClassRoom
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
  classRoomId?: string
  teacherId?: string
}

export interface ApiError {
  statusCode: number
  message: string
  error?: string
}
