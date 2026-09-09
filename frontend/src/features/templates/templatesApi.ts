import { apiRequest, apiRequestBlob } from '@/lib/api'
import type { AcroformField, AcroformFieldInput, FieldConfiguration, FieldDefinition, FieldDefinitionInput, PositionedFieldInput, Template, TemplateField, TemplateForm, TemplateVariant } from './types'

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
export function getVariantPdf(templateId: string, variantId: string) { return apiRequestBlob(`/templates/${templateId}/variants/${variantId}/file`) }
export function getTemplateFields(templateId: string, variantId: string) { return apiRequest<TemplateField[]>(`/templates/${templateId}/variants/${variantId}/fields`) }
export function getAcroformFields(templateId: string, variantId: string) { return apiRequest<AcroformField[]>(`/templates/${templateId}/variants/${variantId}/fields/acroform`) }
export function getFieldDefinitions() { return apiRequest<FieldDefinition[]>('/field-definitions?active=true') }
export function createFieldDefinition(input: FieldDefinitionInput) { return apiRequest<FieldDefinition>('/field-definitions', { method: 'POST', body: JSON.stringify(input) }) }
export function createPositionedField(templateId: string, variantId: string, input: PositionedFieldInput) { return apiRequest<TemplateField>(`/templates/${templateId}/variants/${variantId}/fields`, { method: 'POST', body: JSON.stringify(input) }) }
export function createAcroformField(templateId: string, variantId: string, input: AcroformFieldInput) { return apiRequest<TemplateField>(`/templates/${templateId}/variants/${variantId}/fields/acroform`, { method: 'POST', body: JSON.stringify(input) }) }
export function updatePositionedField(templateId: string, variantId: string, fieldId: string, input: PositionedFieldInput) { return apiRequest<TemplateField>(`/templates/${templateId}/variants/${variantId}/fields/${fieldId}`, { method: 'PUT', body: JSON.stringify(input) }) }
export function deletePositionedField(templateId: string, variantId: string, fieldId: string) { return apiRequest<void>(`/templates/${templateId}/variants/${variantId}/fields/${fieldId}`, { method: 'DELETE' }) }
export function replaceTemplateFields(templateId: string, variantId: string, fields: FieldConfiguration[]) { return apiRequest<TemplateField[]>(`/templates/${templateId}/variants/${variantId}/fields`, { method: 'PUT', body: JSON.stringify({ fields }) }) }
