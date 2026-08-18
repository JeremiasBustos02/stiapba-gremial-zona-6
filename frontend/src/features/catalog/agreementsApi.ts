import { apiRequest } from '@/lib/api'
import type { Agreement, AgreementForm } from './types'

export function getAgreements(search = '') {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  return apiRequest<Agreement[]>(`/agreements?${params.toString()}`)
}

export function createAgreement(data: AgreementForm) {
  return apiRequest<Agreement>('/agreements', { method: 'POST', body: JSON.stringify({ ...data, codigo: data.codigo.trim() || null }) })
}

export function updateAgreement(id: string, data: AgreementForm) {
  return apiRequest<Agreement>(`/agreements/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, codigo: data.codigo.trim() || null }) })
}

export function setAgreementActive(id: string, active: boolean) {
  return apiRequest<void>(`/agreements/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH' })
}
