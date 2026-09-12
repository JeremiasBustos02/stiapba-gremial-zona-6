// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-pdf', async () => {
  const { createElement } = await import('react')
  return { Document: ({ children }: { children: React.ReactNode }) => createElement('div', null, children), Page: () => createElement('div'), pdfjs: { GlobalWorkerOptions: {} } }
})

import { HistoryPage } from './HistoryPage'

let root: Root
let container: HTMLDivElement

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage(role: 'ADMIN' | 'DELEGADO' = 'ADMIN', onUseAsBase?: (detail: unknown) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  root.render(<QueryClientProvider client={client}><HistoryPage role={role} onUseAsBase={onUseAsBase} /></QueryClientProvider>)
}

async function waitFor(assertion: () => void) {
  const deadline = Date.now() + 2_000
  while (true) {
    try { assertion(); return } catch (error) {
      if (Date.now() >= deadline) throw error
      await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 20)) })
    }
  }
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  globalThis.ResizeObserver = class { observe() {}; disconnect() {}; unobserve() {} }
})

afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })

describe('HistoryPage', () => {
  it('renders records and changes the requested page', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost')
      return Promise.resolve(response({ content: [{ id: '1', publicNumber: `PG-2026-00000${url.searchParams.get('page') === '0' ? '1' : '2'}`, documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-10T10:00:00-03:00', createdBy: 'Admin STIA', companyName: 'Empresa', delegateName: 'Ana Paz', issueDate: '2026-08-18' }], page: Number(url.searchParams.get('page')), size: 20, totalElements: 21, totalPages: 2 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await waitFor(() => expect(container.textContent).toContain('PG-2026-000001'))
    expect(container.textContent).toContain('Empresa')
    const documentType = [...container.querySelectorAll('[class*="whitespace-nowrap"]')]
      .find((element) => element.textContent?.includes('Permiso gremial'))
    expect(documentType).not.toBeUndefined()
    const moreActions = container.querySelector<HTMLButtonElement>('button[aria-label="Acciones"]')
    expect(moreActions).not.toBeNull()
    expect(moreActions?.getAttribute('aria-haspopup')).toBe('menu')
    await act(async () => moreActions!.click())
    expect(container.querySelector('[role="menu"]')?.textContent).toContain('Ver PDF')
    expect(container.querySelector('[role="menu"]')?.textContent).toContain('Enviar')
    expect([...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Enviar'))?.getAttribute('aria-disabled')).toBe('true')
    const next = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Siguiente'))
    expect(next).toBeDefined()
    await act(async () => next!.click())
    await waitFor(() => expect(container.textContent).toContain('PG-2026-000002'))
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('history?page=1&size=20'))).toBe(true)
  })

  it('shows the delegate empty state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })))
    renderPage('DELEGADO')
    await waitFor(() => expect(container.textContent).toContain('No hay documentos generados todavía.'))
    expect(container.textContent).toContain('Los documentos que generes aparecerán acá.')
    const exportButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Exportar'))
    expect(exportButton?.disabled).toBe(true)
  })

  it('exports every matching record using current filters without pagination parameters', async () => {
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost')
      if (url.pathname.endsWith('/history/export')) return Promise.resolve(new Response('xlsx', { headers: { 'Content-Disposition': 'attachment; filename="historial.xlsx"' } }))
      return Promise.resolve(response({ content: [{ id: '1', publicNumber: 'PG-2026-000001', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-10T10:00:00-03:00', createdBy: 'Admin STIA', companyName: 'Empresa', delegateName: 'Ana Paz', issueDate: '2026-09-10' }], page: 0, size: 20, totalElements: 237, totalPages: 12 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await waitFor(() => expect(container.textContent).toContain('237 documentos'))
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:export') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const search = container.querySelector<HTMLInputElement>('#history-search')!
    const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => { setInputValue.call(search, 'PG-2026'); search.dispatchEvent(new Event('input', { bubbles: true })) })
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes('q=PG-2026'))).toBe(true))
    const exportButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Exportar'))!
    await act(async () => exportButton.click())
    await waitFor(() => expect(anchorClick).toHaveBeenCalled())
    const exportRequest = fetchMock.mock.calls.map(([input]) => String(input)).find((input) => input.includes('/history/export'))!
    expect(exportRequest).toContain('q=PG-2026')
    expect(exportRequest).not.toContain('page=')
    expect(exportRequest).not.toContain('size=')
  })

  it('prevents duplicate exports while the download is in progress and shows an error on failure', async () => {
    let rejectExport: (reason?: unknown) => void = () => {}
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
      if (path.endsWith('/history/export')) return new Promise<Response>((_, reject) => { rejectExport = reject })
      return Promise.resolve(response({ content: [{ id: '1', publicNumber: 'PG-2026-000001', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-10T10:00:00-03:00', createdBy: 'Admin STIA', companyName: 'Empresa', delegateName: 'Ana Paz', issueDate: '2026-09-10' }], page: 0, size: 20, totalElements: 1, totalPages: 1 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await waitFor(() => expect(container.textContent).toContain('PG-2026-000001'))
    const exportButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Exportar'))!
    await act(async () => exportButton.click())
    await waitFor(() => expect(container.textContent).toContain('Exportando...'))
    expect(exportButton.disabled).toBe(true)
    await act(async () => rejectExport(new Error('network')))
    await waitFor(() => expect(container.textContent).toContain('No pudimos exportar el historial.'))
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes('/history/export'))).toHaveLength(1)
  })

  it('sends debounced search and date filters to the paginated endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await waitFor(() => expect(container.querySelector('#history-search')).not.toBeNull())
    const filtersButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Filtros'))
    await act(async () => filtersButton!.click())
    await waitFor(() => expect(document.querySelector('#history-from-mobile')).not.toBeNull())
    const search = container.querySelector<HTMLInputElement>('#history-search')!
    const from = document.querySelector<HTMLInputElement>('#history-from-mobile')!
    const to = document.querySelector<HTMLInputElement>('#history-to-mobile')!
    const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setInputValue.call(search, 'PG-2026')
      search.dispatchEvent(new Event('input', { bubbles: true }))
      setInputValue.call(from, '2026-01-01')
      from.dispatchEvent(new Event('input', { bubbles: true }))
      from.dispatchEvent(new Event('change', { bubbles: true }))
      setInputValue.call(to, '2026-12-31')
      to.dispatchEvent(new Event('input', { bubbles: true }))
      to.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => {
      const url = String(input)
      return url.includes('q=PG-2026') && url.includes('issueDateFrom=2026-01-01') && url.includes('issueDateTo=2026-12-31') && !url.includes('issueDateFrom=2026-12-31')
    })).toBe(true))
    expect(container.textContent).toContain('Limpiar filtros')
  })

  it('does not expose the creator filter to delegates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })))
    renderPage('DELEGADO')

    await waitFor(() => expect(container.querySelector('#history-search')).not.toBeNull())
    const filtersButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Filtros'))
    await act(async () => filtersButton!.click())
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull())
    expect(document.querySelector('#history-created-by-mobile')).toBeNull()
  })

  it('shows a friendly error when history cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({}, 500)))
    renderPage('DELEGADO')
    await waitFor(() => expect(container.textContent).toContain('No pudimos completar la operación.'))
  })

  it('keeps email sending disabled from history without calling the backend', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
      if (path === '/api/v1/documents/history') return Promise.resolve(response({ content: [{ id: '1', publicNumber: 'PG-2026-000001', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-10T10:00:00-03:00', createdBy: 'Admin STIA', companyName: 'Empresa', delegateName: 'Ana Paz', issueDate: '2026-08-18' }], page: 0, size: 20, totalElements: 1, totalPages: 1 }))
      throw new Error(`Unexpected request: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await waitFor(() => expect(container.querySelector('button[aria-label="Acciones"]')).not.toBeNull())
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Acciones"]')!.click())
    const emailButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Enviar'))
    expect(emailButton?.getAttribute('aria-disabled')).toBe('true')
    await act(async () => emailButton!.click())
    expect(document.body.textContent).toContain('Envío por correo temporalmente deshabilitado')
    expect(document.body.textContent).toContain('Estamos terminando de configurar esta función')
    expect(container.querySelector('[role="tooltip"]')).toBeNull()
    expect(document.body.querySelector('[role="tooltip"]')).not.toBeNull()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/documents/history/1/email'))).toBe(false)
  })

  it('loads the selected historical PDF once into the existing preview without generating a document', async () => {
    let resolvePdf!: (value: Response) => void
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
      if (path === '/api/v1/documents/history') return Promise.resolve(response({ content: [{ id: '1', publicNumber: 'PG-2026-000001', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-10T10:00:00-03:00', createdBy: 'Admin STIA', companyName: 'Empresa', delegateName: 'Ana Paz', issueDate: '2026-08-18' }], page: 0, size: 20, totalElements: 1, totalPages: 1 }))
      if (path === '/api/v1/documents/history/1/pdf') return new Promise<Response>((resolve) => { resolvePdf = resolve })
      throw new Error(`Unexpected request: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await waitFor(() => expect(container.querySelector('button[aria-label="Acciones"]')).not.toBeNull())
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Acciones"]')!.click())
    const viewButton = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Ver PDF')!
    await act(async () => { viewButton.click(); viewButton.click() })
    expect(container.textContent).toContain('Preparando PDF...')
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/documents/history/1/pdf'))).toHaveLength(1)
    await act(async () => resolvePdf(new Response('pdf', { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="historico.pdf"' } })))
    await waitFor(() => expect(container.textContent).toContain('Vista previa'))
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/documents/permiso-gremial/generate'))).toBe(false)
  })

  it('shows a recovery message when the historical PDF cannot be loaded', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
      if (path === '/api/v1/documents/history') return Promise.resolve(response({ content: [{ id: '1', publicNumber: 'PG-2026-000001', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-10T10:00:00-03:00', createdBy: 'Admin STIA', companyName: 'Empresa', delegateName: 'Ana Paz', issueDate: '2026-08-18' }], page: 0, size: 20, totalElements: 1, totalPages: 1 }))
      if (path === '/api/v1/documents/history/1/pdf') return Promise.reject(new Error('offline'))
      throw new Error(`Unexpected request: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await waitFor(() => expect(container.querySelector('button[aria-label="Acciones"]')).not.toBeNull())
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Acciones"]')!.click())
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Ver PDF')!.click())
    await waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain('No pudimos abrir el PDF.'))
  })

  it('loads the detail and exposes the base action without generating a document', async () => {
    const onUseAsBase = vi.fn()
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
      if (path === '/api/v1/documents/history') return Promise.resolve(response({ content: [{ id: '1', publicNumber: 'PG-2026-000003', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-10T10:00:00-03:00', createdBy: 'Admin STIA', companyName: 'Empresa', delegateName: 'Ana Paz', issueDate: '2026-08-18' }], page: 0, size: 20, totalElements: 1, totalPages: 1 }))
      if (path === '/api/v1/documents/history/1') return Promise.resolve(response({ id: '1', publicNumber: 'PG-2026-000003', documentType: 'PERMISO_GREMIAL', templateId: 'template-1', variantId: 'variant-1', createdAt: '2026-09-10T10:00:00-03:00', createdBy: 'Admin STIA', provinceName: 'Buenos Aires', companyName: 'Empresa', delegateName: 'Ana Paz', delegateDni: '12345678', agreementCode: '771/10', permitDay: 15, issueDate: '2026-08-18', provinceId: 'province-1', companyId: 'company-1', delegateId: 'delegate-1', agreementId: 'agreement-1', manualValues: {} }))
      throw new Error(`Unexpected request: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage('ADMIN', onUseAsBase)

    await waitFor(() => expect(container.textContent).toContain('PG-2026-000003'))
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('PG-2026-000003'))!.click())
    await waitFor(() => expect(document.body.textContent).toContain('Usar como base'))
    await act(async () => [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Usar como base'))!.click())

    expect(onUseAsBase).toHaveBeenCalledWith(expect.objectContaining({ variantId: 'variant-1', companyId: 'company-1', permitDay: 15 }))
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/documents/permiso-gremial/generate'))).toBe(false)
  })
})
