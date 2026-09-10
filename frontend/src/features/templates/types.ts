export type Template = {
  id: string
  nombre: string
  descripcion: string
  documentType: 'PERMISO_GREMIAL'
  active: boolean
  createdAt: string
  updatedAt: string
}

export type TemplateVariant = {
  id: string
  templateId: string
  nombre: string
  active: boolean
  legacyPositioned: boolean
  createdAt: string
  updatedAt: string
}

export type TemplateForm = { nombre: string; descripcion: string; documentType: 'PERMISO_GREMIAL' }
export type VariantForm = { nombre: string; archivoPdf: File | null }
export type FieldType = 'TEXT' | 'DATE' | 'NUMBER'
export type FieldSourceType = 'MANUAL' | 'COMPANY' | 'DELEGATE' | 'PROVINCE' | 'AGREEMENT' | 'DERIVED'
export type FieldDefinition = { id: string; key: string; label: string; type: FieldType; sourceType: FieldSourceType; required: boolean; active: boolean }
export type FieldDefinitionInput = { label: string; type: FieldType; sourceType: FieldSourceType; required: boolean }
export type TemplateField = { id: string; fieldDefinitionId: string; fieldKey: string; fieldLabel: string; mode: 'ACROFORM' | 'POSITIONED'; acroFieldName: string | null; required: boolean; displayOrder: number; pageNumber: number | null; x: number | null; y: number | null; width: number | null; height: number | null; fontSize: number | null; minFontSize: number | null; maxFontSize: number | null; alignment: 'LEFT' | 'CENTER' | 'RIGHT' | null; multiline: boolean | null }
export type AcroformField = { acroFieldName: string; displayName: string; partialName: string | null; alternateFieldName: string | null; mappingName: string | null; pageNumber: number; x: number | null; y: number | null; width: number | null; height: number | null }
export type FieldConfiguration = { fieldDefinitionId: string; mode: 'ACROFORM' | 'POSITIONED'; acroFieldName: string | null; required: boolean; displayOrder: number; pageNumber: number | null; x: number | null; y: number | null; width: number | null; height: number | null; fontSize: number | null; minFontSize: number | null; maxFontSize: number | null; alignment: 'LEFT' | 'CENTER' | 'RIGHT' | null; multiline: boolean | null }
