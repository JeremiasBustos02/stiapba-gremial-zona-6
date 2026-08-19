import { apiRequest, apiRequestBlob } from '@/lib/api'
import type { Agreement, Company } from '@/features/catalog/types'
import type { Template, TemplateVariant } from '@/features/templates/types'

export type Province = { id: string; name: string }
export type Delegate = { id: string; nombre: string; apellido: string; dni: string }

export type PermisoGremialRequest = {
  provinceId: string
  issueDate: string
  companyId: string
  delegateId: string
  permitDay: number
  agreementId: string
  variantId: string
}

export const getProvinces = () => apiRequest<Province[]>('/provinces')
export const getDocumentCompanies = () => apiRequest<Company[]>('/companies?active=true')
export const getDelegates = () => apiRequest<Delegate[]>('/delegates')
export const getDocumentAgreements = () => apiRequest<Agreement[]>('/agreements?active=true')
export const getDocumentTemplates = () => apiRequest<Template[]>('/templates?active=true')
export const getDocumentVariants = (templateId: string) => apiRequest<TemplateVariant[]>(`/templates/${templateId}/variants?active=true`)

export function generatePermisoGremial(data: PermisoGremialRequest) {
  return apiRequestBlob('/documents/permiso-gremial/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
