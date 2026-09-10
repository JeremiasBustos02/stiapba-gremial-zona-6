import { describe, expect, it } from 'vitest'
import { clearDocumentDraft, readDocumentDraft, saveDocumentDraft } from './documentDraft'

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

const form = { provinceId: 'province', issueDate: '2026-09-09', companyId: 'company', delegateId: 'delegate', permitDay: '9', agreementId: 'agreement', variantId: 'variant', manualValues: { note: 'value' } }

describe('document draft', () => {
  it('round-trips the versioned document form and template ID', () => {
    const localStorage = storage()
    saveDocumentDraft({ templateId: 'template', form }, localStorage)
    expect(readDocumentDraft(localStorage)).toEqual({ version: 1, templateId: 'template', form })
    clearDocumentDraft(localStorage)
    expect(readDocumentDraft(localStorage)).toBeNull()
  })

  it('removes malformed or unsupported drafts', () => {
    const localStorage = storage({ 'stiapba.document-draft.v1': JSON.stringify({ version: 2, templateId: 'template', form: {} }) })
    expect(readDocumentDraft(localStorage)).toBeNull()
    expect(localStorage.getItem('stiapba.document-draft.v1')).toBeNull()
  })
})
