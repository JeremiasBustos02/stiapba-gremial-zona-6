import { apiRequest } from '@/lib/api'

export type AuthUser = {
  id: string
  nombre: string
  apellido: string
  dni: string
  role: 'ADMIN' | 'DELEGADO'
  active?: boolean
  firstLogin: boolean
}

type LoginResponse = { user: AuthUser }
type PasswordChange = { currentPassword: string; newPassword: string; confirmPassword: string }
type FirstLoginPasswordChange = Omit<PasswordChange, 'currentPassword'>

export function login(dni: string, password: string) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ dni, password }),
    notifyUnauthorized: false,
  })
}

export function getCurrentUser() {
  return apiRequest<AuthUser>('/auth/me', { notifyUnauthorized: false })
}

export function changeFirstLoginPassword(data: FirstLoginPasswordChange) {
  return apiRequest<{ message: string }>('/auth/first-login/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function changePassword(data: PasswordChange) {
  return apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function logout() {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}
