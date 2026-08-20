export type CatalogItem = {
  id: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CompanyAgreement = {
  id: string
  codigo: string | null
  descripcion: string
}

export type Company = CatalogItem & {
  nombre: string
  agreementId: string | null
  agreement: CompanyAgreement | null
}

export type Agreement = CatalogItem & {
  codigo: string | null
  descripcion: string
}

export type CompanyForm = { nombre: string; agreementId: string }
export type AgreementForm = { codigo: string; descripcion: string }
