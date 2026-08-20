import { apiRequest } from '@/lib/api'
import type { Company, CompanyForm } from './types'

export function getCompanies(search = '') {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  return apiRequest<Company[]>(`/companies?${params.toString()}`)
}

export function createCompany(data: CompanyForm) {
  return apiRequest<Company>('/companies', { method: 'POST', body: JSON.stringify({ ...data, agreementId: data.agreementId || null }) })
}

export function updateCompany(id: string, data: CompanyForm) {
  return apiRequest<Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, agreementId: data.agreementId || null }) })
}

export function setCompanyActive(id: string, active: boolean) {
  return apiRequest<void>(`/companies/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH' })
}
