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
