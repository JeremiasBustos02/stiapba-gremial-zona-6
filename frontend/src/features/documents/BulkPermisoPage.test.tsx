// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const generate = vi.fn()
const regenerate = vi.fn()
const downloadBatch = vi.fn()
const download = vi.fn()
const generationFields = vi.fn()
const configuredPermisoFields = [
  { id: 'province-field', key: 'province', label: 'Provincia', type: 'TEXT', sourceType: 'PROVINCE', required: true, displayOrder: 0, inputKey: 'baseValues.provinceId' },
  { id: 'company-field', key: 'company', label: 'Empresa', type: 'TEXT', sourceType: 'COMPANY', required: true, displayOrder: 1, inputKey: 'baseValues.companyId' },
  { id: 'agreement-field', key: 'agreement', label: 'Convenio', type: 'TEXT', sourceType: 'AGREEMENT', required: true, displayOrder: 2, inputKey: 'baseValues.agreementId' },
  { id: 'permit-field', key: 'permitDay', label: 'Día de permiso gremial', type: 'NUMBER', sourceType: 'DERIVED', required: true, displayOrder: 3, inputKey: 'baseValues.permitDay' },
]
const variants = vi.fn()

vi.mock('./documentActions', () => ({ downloadDocument: (...args: unknown[]) => download(...args) }))
vi.mock('react-pdf', async () => {
  const { createElement } = await import('react')
  return { Document: ({ children }: { children: React.ReactNode }) => createElement('div', null, children), Page: () => createElement('div'), pdfjs: { GlobalWorkerOptions: {} } }
})
vi.mock('./documentsApi', () => ({
  getDocumentTemplates: () => Promise.resolve([{ id: 'template', nombre: 'Permiso Gremial', documentType: 'PERMISO_GREMIAL' }]),
  getDocumentVariants: (...args: unknown[]) => variants(...args),
  getGenerationFields: (...args: unknown[]) => generationFields(...args),
  getProvinces: () => Promise.resolve([{ id: 'province', name: 'Buenos Aires' }]),
  getDocumentCompanies: () => Promise.resolve([{ id: 'company', nombre: 'INFRIBA', agreementId: 'agreement' }]),
  getDocumentAgreements: () => Promise.resolve([{ id: 'agreement', codigo: '771/10', descripcion: 'Convenio' }]),
  getDelegates: () => Promise.resolve([{ id: 'ana', nombre: 'Ana', apellido: 'Paz', dni: '31111111' }, { id: 'beto', nombre: 'Beto', apellido: 'Luna', dni: '29888888' }]),
  generateDocumentBatch: (...args: unknown[]) => generate(...args),
  regenerateDocument: (...args: unknown[]) => regenerate(...args),
  downloadPermisoGremialBatch: (...args: unknown[]) => downloadBatch(...args),
  filenameFromHeaders: (headers: Headers) => headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/i)?.[1] ?? '',
}))

import { BulkPermisoPage } from './BulkPermisoPage'

let root: Root
let container: HTMLDivElement
const success = { requested: 2, successful: 2, failed: 0, items: [{ delegateId: 'ana', delegateName: 'Ana Paz', status: 'SUCCESS' as const, documentId: 'record-ana', publicNumber: 'PG-2026-000231', filename: 'ana.pdf', errorCode: null, message: null }, { delegateId: 'beto', delegateName: 'Beto Luna', status: 'SUCCESS' as const, documentId: 'record-beto', publicNumber: 'PG-2026-000232', filename: 'beto.pdf', errorCode: null, message: null }] }
const wait = () => new Promise(resolve => window.setTimeout(resolve, 0))
const change = (element: HTMLInputElement | HTMLSelectElement, value: string) => { const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')!.set!; setter.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })) }
const button = (text: string) => [...container.querySelectorAll('button')].find(item => item.textContent?.includes(text)) as HTMLButtonElement
const delegateInput = (name: string) => [...container.querySelectorAll('label')].find(label => label.textContent?.includes(name))?.querySelector('input') as HTMLInputElement

beforeEach(() => { ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; globalThis.ResizeObserver = class { observe() {}; disconnect() {}; unobserve() {} }; container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); generate.mockReset(); regenerate.mockReset(); downloadBatch.mockReset(); download.mockReset(); generationFields.mockReset(); generationFields.mockResolvedValue(configuredPermisoFields); variants.mockReset(); variants.mockResolvedValue([{ id: 'variant', nombre: 'Firma A' }, { id: 'variant-b', nombre: 'Firma B' }]) })
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks() })

async function render(onBack = vi.fn()) { await act(async () => root.render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><BulkPermisoPage onBack={onBack} /></QueryClientProvider>)); await act(async () => wait()); return onBack }
async function completeForm(delegates = ['Ana Paz']) { await act(async () => { change(container.querySelector('#bulk-plantilla')!, 'template') }); await act(async () => wait()); await act(async () => { change(container.querySelector('#bulk-variante')!, 'variant') }); await act(async () => wait()); await act(async () => { change(container.querySelector('#bulk-provincia')!, 'province'); change(container.querySelector('#bulk-empresa')!, 'company'); change(container.querySelector('input[type="number"]')!, '18'); delegates.forEach(name => delegateInput(name)?.click()) }); await act(async () => wait()) }

describe('BulkPermisoPage', () => {
  it('loads common catalogs, filters delegates by name and DNI, and maintains a unique selection count', async () => {
    await render()
    expect(container.textContent).toContain('Generar varios permisos'); expect(container.textContent).toContain('Permiso Gremial para cada uno.'); expect(container.textContent).toContain('Ana Paz'); expect(container.textContent).toContain('0 seleccionados')
    await act(async () => change(container.querySelector('#bulk-delegate-filter')!, '2988'))
    expect(container.textContent).toContain('Beto Luna'); expect(container.textContent).not.toContain('Ana Paz')
    await act(async () => change(container.querySelector('#bulk-delegate-filter')!, ''))
    const ana = delegateInput('Ana Paz'); await act(async () => { ana.click(); ana.click() })
    expect(container.textContent).toContain('0 seleccionados')
  })

  it('blocks an incomplete request and confirms the complete common request before sending it once', async () => {
    generate.mockResolvedValue(success); await render()
    expect(button('Continuar').disabled).toBe(true)
    await completeForm(['Ana Paz', 'Beto Luna'])
    expect(button('Continuar').disabled).toBe(false)
    await act(async () => button('Continuar').click())
    expect(container.textContent).toContain('Generar 2 permisos'); expect(generate).not.toHaveBeenCalled()
    await act(async () => button('Generar 2 permisos').click())
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ documentType: 'PERMISO_GREMIAL', variantId: 'variant', baseValues: expect.objectContaining({ provinceId: 'province', companyId: 'company', agreementId: 'agreement', permitDay: '18' }), manualValues: {}, delegateIds: ['ana', 'beto'] }))
    await act(async () => wait())
    expect(container.textContent).toContain('2 permisos procesados'); expect(container.textContent).toContain('PG-2026-000231')
  })

  it('requires configured manual values and sends the common values for every selected delegate', async () => {
    generationFields.mockResolvedValue([...configuredPermisoFields, { id: 'reason', key: 'reason', label: 'Motivo', type: 'TEXT', sourceType: 'MANUAL', required: true, displayOrder: 5, inputKey: 'manualValues.reason' }]); generate.mockResolvedValue(success); await render(); await completeForm(['Ana Paz', 'Beto Luna']); await act(async () => wait())
    expect(container.textContent).toContain('Motivo'); expect(button('Continuar').disabled).toBe(true)
    await act(async () => change(container.querySelector('#manual-reason')!, 'Asamblea'))
    expect(button('Continuar').disabled).toBe(false)
    await act(async () => button('Continuar').click()); await act(async () => button('Generar 2 permisos').click())
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ manualValues: { reason: 'Asamblea' }, delegateIds: ['ana', 'beto'] }))
  })

  it('clears manual values when the selected variant changes', async () => {
    generationFields.mockImplementation((_documentType: string, variantId: string) => Promise.resolve(variantId === 'variant' ? [...configuredPermisoFields, { id: 'reason', key: 'reason', label: 'Motivo', type: 'TEXT', sourceType: 'MANUAL', required: true, displayOrder: 5, inputKey: 'manualValues.reason' }] : [...configuredPermisoFields, { id: 'place', key: 'place', label: 'Lugar', type: 'TEXT', sourceType: 'MANUAL', required: true, displayOrder: 5, inputKey: 'manualValues.place' }])); await render(); await completeForm(); await act(async () => change(container.querySelector('#manual-reason')!, 'Asamblea')); await act(async () => { change(container.querySelectorAll('select')[1], 'variant-b'); await wait(); await wait() })
    expect(container.querySelector('#manual-reason')).toBeNull(); expect(container.querySelector('#manual-place')).not.toBeNull(); expect(button('Continuar').disabled).toBe(true)
  })

  it('renders only custom fields configured on the selected variant', async () => {
    generationFields.mockResolvedValue([{ id: 'custom-a', key: 'customFieldA', label: 'Campo A', type: 'TEXT', sourceType: 'MANUAL', required: true, displayOrder: 0, inputKey: 'manualValues.custom-a' }, { id: 'custom-b', key: 'customFieldB', label: 'Campo B', type: 'TEXT', sourceType: 'MANUAL', required: false, displayOrder: 1, inputKey: 'manualValues.custom-b' }])
    await render(); await act(async () => change(container.querySelector('#bulk-plantilla')!, 'template')); await act(async () => wait()); await act(async () => change(container.querySelector('#bulk-variante')!, 'variant')); await act(async () => wait())
    expect(container.textContent).toContain('Campo A')
    expect(container.textContent).toContain('Campo B')
    expect(container.textContent).not.toContain('Empresa')
  })

  it('keeps partial successes visible, downloads one PDF, and archives only successful records', async () => {
    generate.mockResolvedValue({ ...success, successful: 1, failed: 1, items: [success.items[0], { delegateId: 'beto', delegateName: 'Beto Luna', status: 'FAILED', documentId: null, publicNumber: null, filename: null, errorCode: 'DELEGATE_NOT_FOUND', message: 'No encontramos un delegado activo.' }] }); regenerate.mockResolvedValue({ blob: new Blob(['pdf']), headers: new Headers({ 'Content-Disposition': 'inline; filename="ana.pdf"' }) }); downloadBatch.mockResolvedValue({ blob: new Blob(['zip']), headers: new Headers({ 'Content-Disposition': 'attachment; filename="permisos.zip"' }) }); await render(); await completeForm(['Ana Paz', 'Beto Luna']); await act(async () => button('Continuar').click()); await act(async () => button('Generar 2 permisos').click()); await act(async () => wait())
    expect(container.textContent).toContain('1 generados correctamente'); expect(container.textContent).toContain('No encontramos un delegado activo.')
    await act(async () => button('Ver').click()); await act(async () => wait())
    expect(regenerate).toHaveBeenCalledWith('record-ana'); expect(container.textContent).toContain('Vista previa'); expect(generate).toHaveBeenCalledOnce()
    await act(async () => button('Editar documento').click())
    await act(async () => button('Descargar').click()); expect(regenerate).toHaveBeenCalledWith('record-ana'); expect(download).toHaveBeenCalledWith(expect.any(Blob), 'ana.pdf')
    await act(async () => button('Descargar todos').click()); expect(downloadBatch).toHaveBeenCalledWith(['record-ana']); expect(download).toHaveBeenCalledWith(expect.any(Blob), 'permisos.zip')
  })

  it('shows feedback when viewing an existing bulk document fails', async () => {
    generate.mockResolvedValue(success); regenerate.mockRejectedValue(new Error('offline')); await render(); await completeForm(['Ana Paz']); await act(async () => button('Continuar').click()); await act(async () => button('Generar 1 permisos').click()); await act(async () => wait())
    await act(async () => button('Ver').click()); await act(async () => wait())
    expect(regenerate).toHaveBeenCalledWith('record-ana'); expect(container.querySelector('[role="alert"]')?.textContent).toContain('No pudimos abrir el permiso.')
  })

  it('does not offer ZIP when all items fail and preserves the form after a global error', async () => {
    generate.mockRejectedValue(new Error('offline')); await render(); await completeForm(); await act(async () => button('Continuar').click()); await act(async () => button('Generar 1 permisos').click()); await act(async () => wait())
    expect(container.textContent).toContain('No pudimos generar los permisos'); expect(container.querySelector('select')?.value).toBe('template')
    generate.mockResolvedValue({ requested: 1, successful: 0, failed: 1, items: [{ delegateId: 'ana', delegateName: 'Ana Paz', status: 'FAILED', documentId: null, publicNumber: null, filename: null, errorCode: 'DELEGATE_NOT_FOUND', message: 'No encontrado' }] }); await act(async () => button('Generar 1 permisos').click()); await act(async () => wait())
    expect(container.textContent).not.toContain('Descargar todos')
  })

  it('announces generation, blocks a duplicate confirmation, and finalizes through the supplied navigation', async () => {
    let resolve!: (value: typeof success) => void; generate.mockReturnValue(new Promise<typeof success>(done => { resolve = done })); const onBack = await render(); await completeForm(['Ana Paz', 'Beto Luna']); await act(async () => button('Continuar').click()); await act(async () => { button('Generar 2 permisos').click(); button('Generar 2 permisos').click() })
    expect(container.textContent).toContain('Generando permisos...'); expect(container.querySelector('[aria-busy="true"]')).not.toBeNull(); expect(generate).toHaveBeenCalledOnce()
    await act(async () => resolve(success)); await act(async () => wait()); await act(async () => button('Finalizar').click())
    expect(onBack).toHaveBeenCalledOnce()
  })
})
