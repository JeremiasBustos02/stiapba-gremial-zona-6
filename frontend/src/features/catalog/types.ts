export type CatalogItem = {
  id: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type Company = CatalogItem & { nombre: string }

export type Agreement = CatalogItem & {
  codigo: string | null
  descripcion: string
}

export type CompanyForm = { nombre: string }
export type AgreementForm = { codigo: string; descripcion: string }
