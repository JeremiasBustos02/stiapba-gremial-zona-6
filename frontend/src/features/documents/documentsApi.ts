import { apiRequest, apiRequestBlobWithHeaders } from '@/lib/api'
import type { Agreement, Company } from '@/features/catalog/types'
import type { Template, TemplateVariant } from '@/features/templates/types'
import type { DocumentType } from '@/features/templates/types'

export type Province = { id: string; name: string }
export type Delegate = { id: string; nombre: string; apellido: string; dni: string }
export type DocumentSuggestionItem = { id: string; label: string }
export type DocumentSuggestionCategory = { recent: DocumentSuggestionItem[]; frequent: DocumentSuggestionItem[] }
export type DocumentSuggestions = { companies: DocumentSuggestionCategory; delegates: DocumentSuggestionCategory; agreements: DocumentSuggestionCategory }

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
export type GenerationField = { id: string; key: string; label: string; type: 'TEXT' | 'DATE' | 'NUMBER'; sourceType: 'MANUAL' | 'COMPANY' | 'DELEGATE' | 'PROVINCE' | 'AGREEMENT' | 'DERIVED'; required: boolean; displayOrder: number; inputKey: string }
export type GeneratedDocument = { blob: Blob; documentId: string; publicNumber: string; filename: string }
export type PermisoGremialBatchRequest = Omit<PermisoGremialRequest, 'delegateId'> & { delegateIds: string[] }
export type DocumentGenerationRequest = {
  documentType: DocumentType
  variantId: string
  baseValues: Record<string, string>
  manualValues: Record<string, string>
}
export type DocumentBulkRequest = DocumentGenerationRequest & { delegateIds: string[] }
export type BatchDocumentItem = { delegateId: string; delegateName: string; status: 'SUCCESS' | 'FAILED'; documentId: string | null; publicNumber: string | null; filename: string | null; errorCode: string | null; message: string | null }
export type BatchDocumentResult = { requested: number; successful: number; failed: number; items: BatchDocumentItem[] }

export const getProvinces = () => apiRequest<Province[]>('/provinces')
export const getDocumentCompanies = () => apiRequest<Company[]>('/companies?active=true')
export const getDelegates = () => apiRequest<Delegate[]>('/delegates')
export const getDocumentAgreements = () => apiRequest<Agreement[]>('/agreements?active=true')
export const getDocumentSuggestions = () => apiRequest<DocumentSuggestions>('/documents/suggestions')
export const getDocumentTemplates = () => apiRequest<Template[]>('/templates?active=true')
export const getDocumentVariants = (templateId: string) => apiRequest<TemplateVariant[]>(`/templates/${templateId}/variants?active=true`)
export const getManualFields = (documentType: DocumentType, variantId: string) => apiRequest<ManualField[]>(`/documents/${documentType}/variants/${variantId}/manual-fields`)
export const getGenerationFields = (documentType: DocumentType, variantId: string) => apiRequest<GenerationField[]>(`/documents/${documentType}/variants/${variantId}/generation-fields`)

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

export type DocumentHistoryDetail = DocumentHistoryRecord & {
  templateId: string
  variantId: string
  provinceName: string
  delegateDni: string
  agreementCode: string
  permitDay: number | null
  provinceId: string | null
  companyId: string | null
  delegateId: string | null
  agreementId: string | null
  manualValues: Record<string, string>
}

export type DocumentHistoryPage = {
  content: DocumentHistoryRecord[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type DashboardDocument = DocumentHistoryRecord
export type DashboardResponse = {
  documentsThisMonth: number
  totalDocuments: number
  latestDocument: DashboardDocument | null
  recentActivity: DashboardDocument[]
}

export const getDashboard = () => apiRequest<DashboardResponse>('/documents/dashboard')

export type DocumentHistoryFilters = {
  q?: string
  documentType?: 'PERMISO_GREMIAL'
  issueDateFrom?: string
  issueDateTo?: string
  createdBy?: string
  order?: 'newest' | 'oldest'
}

export const getDocumentHistory = (page: number, filters: DocumentHistoryFilters = {}) => {
  const params = new URLSearchParams({ page: String(page), size: '20' })
  if (filters.q) params.set('q', filters.q)
  if (filters.documentType) params.set('documentType', filters.documentType)
  if (filters.issueDateFrom) params.set('issueDateFrom', filters.issueDateFrom)
  if (filters.issueDateTo) params.set('issueDateTo', filters.issueDateTo)
  if (filters.createdBy) params.set('createdBy', filters.createdBy)
  if (filters.order) params.set('order', filters.order)
  return apiRequest<DocumentHistoryPage>(`/documents/history?${params}`)
}

export const exportDocumentHistory = (filters: DocumentHistoryFilters = {}) => {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.documentType) params.set('documentType', filters.documentType)
  if (filters.issueDateFrom) params.set('issueDateFrom', filters.issueDateFrom)
  if (filters.issueDateTo) params.set('issueDateTo', filters.issueDateTo)
  if (filters.createdBy) params.set('createdBy', filters.createdBy)
  if (filters.order) params.set('order', filters.order)
  return apiRequestBlobWithHeaders(`/documents/history/export?${params}`)
}

export const regenerateDocument = (id: string) => apiRequestBlobWithHeaders(`/documents/history/${id}/pdf`)
export const getDocumentHistoryDetail = (id: string) => apiRequest<DocumentHistoryDetail>(`/documents/history/${id}`)
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

export async function generateDocument(data: DocumentGenerationRequest): Promise<GeneratedDocument> {
  const result = await apiRequestBlobWithHeaders('/documents/generate', {
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

export const generatePermisoGremialBatch = (data: PermisoGremialBatchRequest) => apiRequest<BatchDocumentResult>('/documents/bulk', { method: 'POST', body: JSON.stringify(data) })
export const generateDocumentBatch = (data: DocumentBulkRequest) => apiRequest<BatchDocumentResult>('/documents/bulk/generate', { method: 'POST', body: JSON.stringify(data) })
export const downloadPermisoGremialBatch = (documentIds: string[]) => apiRequestBlobWithHeaders('/documents/bulk/zip', { method: 'POST', body: JSON.stringify({ documentIds }) })

export function filenameFromHeaders(headers: Headers) {
  const value = headers.get('Content-Disposition')
  const match = value?.match(/filename="?([^";]+)"?/i)
  return match?.[1] ?? ''
}
