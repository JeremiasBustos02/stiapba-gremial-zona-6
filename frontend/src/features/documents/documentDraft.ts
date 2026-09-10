import type { DocumentFormValues } from './DocumentFlow'

const storageKey = 'stiapba.document-draft.v1'

export type DocumentDraft = {
  version: 1
  templateId: string
  form: DocumentFormValues
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && Object.values(value).every((item) => typeof item === 'string')
}

function isDocumentForm(value: unknown): value is DocumentFormValues {
  if (typeof value !== 'object' || value === null) return false
  const form = value as Record<string, unknown>
  return ['provinceId', 'issueDate', 'companyId', 'delegateId', 'permitDay', 'agreementId', 'variantId'].every((key) => typeof form[key] === 'string') && isStringRecord(form.manualValues)
}

export function readDocumentDraft(storage: Pick<Storage, 'getItem' | 'removeItem'> = window.localStorage): DocumentDraft | null {
  const raw = storage.getItem(storageKey)
  if (!raw) return null
  try {
    const draft: unknown = JSON.parse(raw)
    if (typeof draft !== 'object' || draft === null) throw new Error('Invalid draft')
    const value = draft as Record<string, unknown>
    if (value.version !== 1 || typeof value.templateId !== 'string' || !value.templateId || !isDocumentForm(value.form)) throw new Error('Invalid draft')
    return { version: 1, templateId: value.templateId, form: value.form }
  } catch {
    storage.removeItem(storageKey)
    return null
  }
}

export function saveDocumentDraft(draft: Omit<DocumentDraft, 'version'>, storage: Pick<Storage, 'setItem'> = window.localStorage) {
  storage.setItem(storageKey, JSON.stringify({ version: 1, ...draft }))
}

export function clearDocumentDraft(storage: Pick<Storage, 'removeItem'> = window.localStorage) {
  storage.removeItem(storageKey)
}
