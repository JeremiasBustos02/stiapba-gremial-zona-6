// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryPage } from './HistoryPage'

let root: Root
let container: HTMLDivElement

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage(role: 'ADMIN' | 'DELEGADO' = 'ADMIN') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  root.render(<QueryClientProvider client={client}><HistoryPage role={role} /></QueryClientProvider>)
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
  })

  it('shows a friendly error when history cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({}, 500)))
    renderPage('DELEGADO')
    await waitFor(() => expect(container.textContent).toContain('No pudimos completar la operación.'))
  })

  it('opens the email dialog and validates the recipient before sending', async () => {
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
      if (path === '/api/v1/documents/history') return Promise.resolve(response({ content: [{ id: '1', publicNumber: 'PG-2026-000001', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-10T10:00:00-03:00', createdBy: 'Admin STIA', companyName: 'Empresa', delegateName: 'Ana Paz', issueDate: '2026-08-18' }], page: 0, size: 20, totalElements: 1, totalPages: 1 }))
      throw new Error(`Unexpected request: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await waitFor(() => expect(container.textContent).toContain('Enviar por mail'))
    const emailButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Enviar por mail'))
    await act(async () => emailButton!.click())
    await waitFor(() => expect(document.querySelector<HTMLInputElement>('input[autocomplete="email"]')).not.toBeNull())
    const dialog = document.querySelector('[role="dialog"]')!
    const sendButton = [...dialog.querySelectorAll('button')].find((button) => button.textContent?.includes('Enviar correo'))
    await act(async () => sendButton!.click())
    await waitFor(() => expect(document.body.textContent).toContain('Ingresá uno o más correos electrónicos válidos'))
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/documents/history/1/email'))).toBe(false)
  })
})
