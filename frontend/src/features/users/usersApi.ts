import { apiRequest } from '@/lib/api'
import type {
  EditUserForm,
  CreateUserResponse,
  ResetPasswordResponse,
  User,
  UserForm,
  UserPage,
} from './types'

export function getUsers(search = '') {
  const params = new URLSearchParams({ page: '0', size: '100' })
  if (search.trim()) params.set('search', search.trim())
  return apiRequest<UserPage>(`/users?${params.toString()}`)
}

export function createUser(data: UserForm) {
  return apiRequest<CreateUserResponse>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateUser(id: string, data: EditUserForm) {
  return apiRequest<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function setUserActive(id: string, active: boolean) {
  return apiRequest<void>(`/users/${id}/${active ? 'activate' : 'deactivate'}`, {
    method: 'PATCH',
  })
}

export function resetUserPassword(id: string) {
  return apiRequest<ResetPasswordResponse>(`/users/${id}/reset-password`, {
    method: 'POST',
  })
}
