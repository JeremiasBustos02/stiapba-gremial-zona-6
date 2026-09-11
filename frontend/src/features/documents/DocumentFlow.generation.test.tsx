// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const generate = vi.fn()
vi.mock('react-pdf', async () => {
  const { createElement } = await import('react')
  return { Document: ({ children }: { children: React.ReactNode }) => createElement('div', null, children), Page: () => createElement('div'), pdfjs: { GlobalWorkerOptions: {} } }
})
vi.mock('./documentsApi', () => ({
  generatePermisoGremial: (...args: unknown[]) => generate(...args),
  getProvinces: () => Promise.resolve([{ id: 'province', name: 'Buenos Aires' }]),
  getDocumentCompanies: () => Promise.resolve([{ id: 'company', nombre: 'Empresa' }]),
  getDelegates: () => Promise.resolve([{ id: 'delegate', nombre: 'Ana', apellido: 'Paz', dni: '123' }]),
  getDocumentAgreements: () => Promise.resolve([{ id: 'agreement', codigo: '771/10', descripcion: 'Convenio' }]),
  getDocumentSuggestions: () => Promise.resolve({ companies: { recent: [], frequent: [] }, delegates: { recent: [], frequent: [] }, agreements: { recent: [], frequent: [] } }),
  getManualFields: () => Promise.resolve([]),
  getDocumentTemplates: () => Promise.resolve([]),
  getDocumentVariants: () => Promise.resolve([]),
}))

import { PermisoGremialForm, type DocumentFormValues } from './DocumentFlow'

let root: Root
let container: HTMLDivElement
const value: DocumentFormValues = { provinceId: 'province', issueDate: '2026-09-11', companyId: 'company', delegateId: 'delegate', permitDay: '15', agreementId: 'agreement', variantId: 'variant', manualValues: {} }
const wait = () => new Promise((resolve) => window.setTimeout(resolve, 0))

beforeEach(() => { ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); generate.mockReset() })
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers() })

describe('PermisoGremialForm generation experience', () => {
  it('blocks duplicate submission, reveals the public number, then continues with the same Blob', async () => {
    vi.useFakeTimers()
    let resolveGeneration!: (document: { blob: Blob; documentId: string; publicNumber: string; filename: string }) => void
    generate.mockReturnValue(new Promise((resolve) => { resolveGeneration = resolve }))
    const onGenerated = vi.fn()
    await act(async () => root.render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PermisoGremialForm value={value} onChange={vi.fn()} onBack={vi.fn()} onGenerated={onGenerated} /></QueryClientProvider>))
    await act(async () => { await vi.runAllTimersAsync() })
    const form = container.querySelector('form')!
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    expect(generate).toHaveBeenCalledOnce()
    expect(container.textContent).toContain('Generando documento')
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    await act(async () => resolveGeneration({ blob, documentId: 'record', publicNumber: 'PG-2026-000144', filename: 'pg.pdf' }))
    await act(async () => { await Promise.resolve() })
    expect(container.textContent).toContain('PG-2026-000144')
    await act(async () => { await vi.advanceTimersByTimeAsync(320) })
    expect(onGenerated).toHaveBeenCalledWith(expect.objectContaining({ blob, publicNumber: 'PG-2026-000144' }))
  })

  it('returns to the populated form after a generation error', async () => {
    generate.mockRejectedValue(new Error('failed'))
    await act(async () => root.render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PermisoGremialForm value={value} onChange={vi.fn()} onBack={vi.fn()} onGenerated={vi.fn()} /></QueryClientProvider>))
    await act(async () => { await wait() })
    await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    await act(async () => { await wait() })
    expect(container.textContent).toContain('No pudimos generar el documento.')
    expect(container.querySelector<HTMLSelectElement>('#document-empresa')?.value).toBe('company')
  })
})
