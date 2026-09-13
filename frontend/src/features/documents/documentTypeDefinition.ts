import type { DocumentType } from '@/features/templates/types'

export type DocumentBaseField = {
  key: 'provinceId' | 'issueDate' | 'companyId' | 'delegateId' | 'permitDay' | 'agreementId'
  label: string
  input: 'select' | 'date' | 'number' | 'text'
  catalog?: 'provinces' | 'companies' | 'delegates' | 'agreements'
  section: 'institutional' | 'recipient' | 'details'
  sharedInBulk: boolean
  required: boolean
}

export type DocumentTypeDefinition = {
  fields: readonly DocumentBaseField[]
  supportsBulkRecipients: boolean
}

const permisoGremialFields = [
  { key: 'provinceId', label: 'Provincia', input: 'select', catalog: 'provinces', section: 'institutional', sharedInBulk: true, required: true },
  { key: 'companyId', label: 'Empresa', input: 'select', catalog: 'companies', section: 'institutional', sharedInBulk: true, required: true },
  { key: 'delegateId', label: 'Delegado', input: 'select', catalog: 'delegates', section: 'recipient', sharedInBulk: false, required: true },
  { key: 'agreementId', label: 'Convenio', input: 'select', catalog: 'agreements', section: 'details', sharedInBulk: true, required: true },
  { key: 'issueDate', label: 'Fecha de emisión', input: 'date', section: 'details', sharedInBulk: true, required: true },
  { key: 'permitDay', label: 'Día de permiso gremial', input: 'number', section: 'details', sharedInBulk: true, required: true },
] as const satisfies readonly DocumentBaseField[]

export const documentTypeDefinitions: Record<DocumentType, DocumentTypeDefinition> = {
  PERMISO_GREMIAL: { fields: permisoGremialFields, supportsBulkRecipients: true },
}

export function documentTypeDefinition(documentType: DocumentType) {
  return documentTypeDefinitions[documentType]
}
