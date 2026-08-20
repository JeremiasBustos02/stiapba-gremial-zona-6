import { describe, expect, it } from 'vitest'
import { agreementAfterCompanyChange, agreementForCompany } from './companyAgreement'

const companies = [
  { id: 'company-with-agreement', nombre: 'Empresa Uno', agreementId: 'agreement-1', agreement: null, active: true, createdAt: '', updatedAt: '' },
  { id: 'company-without-agreement', nombre: 'Empresa Dos', agreementId: null, agreement: null, active: true, createdAt: '', updatedAt: '' },
]

describe('agreementForCompany', () => {
  it('preselects the company agreement', () => {
    expect(agreementForCompany(companies, 'company-with-agreement', '')).toBe('agreement-1')
  })

  it('preserves a manually selected agreement when the company has none', () => {
    expect(agreementForCompany(companies, 'company-without-agreement', 'manual-agreement')).toBe('manual-agreement')
  })

  it('does not overwrite a manual agreement change while the company remains selected', () => {
    expect(agreementAfterCompanyChange(companies, 'company-with-agreement', 'company-with-agreement', 'manual-agreement')).toBe('manual-agreement')
  })
})
