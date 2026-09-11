import { apiRequest, apiRequestBlobWithHeaders } from '@/lib/api'
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
  manualValues: Record<string, string>
}
export type ManualField = { id: string; label: string; type: 'TEXT' | 'DATE' | 'NUMBER'; required: boolean }
export type GeneratedDocument = { blob: Blob; documentId: string; publicNumber: string; filename: string }

export const getProvinces = () => apiRequest<Province[]>('/provinces')
export const getDocumentCompanies = () => apiRequest<Company[]>('/companies?active=true')
export const getDelegates = () => apiRequest<Delegate[]>('/delegates')
export const getDocumentAgreements = () => apiRequest<Agreement[]>('/agreements?active=true')
export const getDocumentTemplates = () => apiRequest<Template[]>('/templates?active=true')
export const getDocumentVariants = (templateId: string) => apiRequest<TemplateVariant[]>(`/templates/${templateId}/variants?active=true`)
export const getManualFields = (variantId: string) => apiRequest<ManualField[]>(`/documents/permiso-gremial/variants/${variantId}/manual-fields`)

export type DocumentHistoryRecord = {
  id: string
  publicNumber: string
  documentType: 'PERMISO_GREMIAL'
  createdAt: string
  createdBy: string
  companyName: string
  delegateName: string
  issueDate: string
}

export type DocumentHistoryPage = {
  content: DocumentHistoryRecord[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type DocumentHistoryFilters = {
  q?: string
  issueDateFrom?: string
  issueDateTo?: string
  createdBy?: string
  order?: 'newest' | 'oldest'
}

export const getDocumentHistory = (page: number, filters: DocumentHistoryFilters = {}) => {
  const params = new URLSearchParams({ page: String(page), size: '20' })
  if (filters.q) params.set('q', filters.q)
  if (filters.issueDateFrom) params.set('issueDateFrom', filters.issueDateFrom)
  if (filters.issueDateTo) params.set('issueDateTo', filters.issueDateTo)
  if (filters.createdBy) params.set('createdBy', filters.createdBy)
  if (filters.order) params.set('order', filters.order)
  return apiRequest<DocumentHistoryPage>(`/documents/history?${params}`)
}

export const regenerateDocument = (id: string) => apiRequestBlobWithHeaders(`/documents/history/${id}/pdf`)
export type SendDocumentEmailRequest = { recipients: string[]; subject: string; message: string }

export const sendDocumentEmail = (id: string, request: SendDocumentEmailRequest) => apiRequest<{ message: string }>(`/documents/history/${id}/email`, {
  method: 'POST',
  body: JSON.stringify(request),
})

export async function generatePermisoGremial(data: PermisoGremialRequest): Promise<GeneratedDocument> {
  const result = await apiRequestBlobWithHeaders('/documents/permiso-gremial/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return {
    blob: result.blob,
    documentId: result.headers.get('X-Document-Id') ?? '',
    publicNumber: result.headers.get('X-Public-Number') ?? '',
    filename: filenameFromHeaders(result.headers),
  }
}

export function filenameFromHeaders(headers: Headers) {
  const value = headers.get('Content-Disposition')
  const match = value?.match(/filename="?([^";]+)"?/i)
  return match?.[1] ?? ''
}
