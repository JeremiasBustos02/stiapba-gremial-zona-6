export type Template = {
  id: string
  nombre: string
  descripcion: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type TemplateVariant = {
  id: string
  templateId: string
  nombre: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type TemplateForm = { nombre: string; descripcion: string }
export type VariantForm = { nombre: string; archivoPdf: File | null }
export type FieldDefinition = { id: string; key: string }
export type TemplateField = { id: string; fieldDefinitionId: string; fieldKey: string; mode: 'ACROFORM' | 'POSITIONED'; required: boolean; displayOrder: number; pageNumber: number | null; x: number | null; y: number | null; width: number | null; height: number | null; fontSize: number | null; minFontSize: number | null; maxFontSize: number | null; alignment: 'LEFT' | 'CENTER' | 'RIGHT' | null; multiline: boolean | null }
export type PositionedFieldInput = { fieldDefinitionId: string; required: boolean; displayOrder: number; pageNumber: number; x: number; y: number; width: number; height: number; fontSize: number; minFontSize: number; maxFontSize: number; alignment: 'LEFT' | 'CENTER' | 'RIGHT'; multiline: boolean }
