import { apiRequest } from '@/lib/api'
import type { Template, TemplateForm, TemplateVariant } from './types'

export function getTemplates(search = '') {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  return apiRequest<Template[]>(`/templates?${params.toString()}`)
}

export function createTemplate(data: TemplateForm) {
  return apiRequest<Template>('/templates', { method: 'POST', body: JSON.stringify(data) })
}

export function updateTemplate(id: string, data: TemplateForm) {
  return apiRequest<Template>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function setTemplateActive(id: string, active: boolean) {
  return apiRequest<void>(`/templates/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH' })
}

export function getVariants(templateId: string, search = '') {
  const params = new URLSearchParams()
  if (search.trim()) params.set('search', search.trim())
  return apiRequest<TemplateVariant[]>(`/templates/${templateId}/variants?${params.toString()}`)
}

export function createVariant(templateId: string, nombre: string, archivoPdf: File) {
  const formData = new FormData()
  formData.append('nombre', nombre)
  formData.append('archivoPdf', archivoPdf)
  return apiRequest<TemplateVariant>(`/templates/${templateId}/variants`, { method: 'POST', body: formData })
}

export function updateVariant(templateId: string, variantId: string, nombre: string) {
  return apiRequest<TemplateVariant>(`/templates/${templateId}/variants/${variantId}`, {
    method: 'PUT',
    body: JSON.stringify({ nombre }),
  })
}

export function replaceVariantFile(templateId: string, variantId: string, archivoPdf: File) {
  const formData = new FormData()
  formData.append('archivoPdf', archivoPdf)
  return apiRequest<TemplateVariant>(`/templates/${templateId}/variants/${variantId}/file`, { method: 'PUT', body: formData })
}

export function setVariantActive(templateId: string, variantId: string, active: boolean) {
  return apiRequest<void>(`/templates/${templateId}/variants/${variantId}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH' })
}
