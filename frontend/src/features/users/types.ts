export type Role = 'ADMIN' | 'DELEGADO'

export type User = {
  id: string
  nombre: string
  apellido: string
  dni: string
  role: Role
  active: boolean
  firstLogin: boolean
  createdAt: string
  updatedAt: string
}

export type UserPage = {
  content: User[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type UserForm = {
  nombre: string
  apellido: string
  dni: string
  role: Role
}

export type EditUserForm = Omit<UserForm, 'dni'>

export type CreateUserResponse = {
  id: string
  nombre: string
  apellido: string
  dni: string
  role: Role
  active: boolean
  firstLogin: boolean
  temporaryPassword: string
}

export type ResetPasswordResponse = {
  temporaryPassword: string
}
