import type { Company } from '@/features/catalog/types'

export function agreementForCompany(companies: Company[], companyId: string, currentAgreementId: string) {
  return companies.find((company) => company.id === companyId)?.agreementId ?? currentAgreementId
}

export function agreementAfterCompanyChange(
  companies: Company[],
  previousCompanyId: string,
  companyId: string,
  currentAgreementId: string,
) {
  return previousCompanyId === companyId
    ? currentAgreementId
    : agreementForCompany(companies, companyId, currentAgreementId)
}
