// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/features/auth/authApi'
import { HomePage } from './HomePage'

let root: Root
let container: HTMLDivElement
const delegate: AuthUser = { id: 'user-1', nombre: 'Juan', apellido: 'Pérez', dni: '123', role: 'DELEGADO', active: true, firstLogin: false }
const admin: AuthUser = { ...delegate, role: 'ADMIN' }

function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }
function renderPage(user = delegate, onNavigate = vi.fn()) { root.render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><HomePage user={user} onNavigate={onNavigate} /></QueryClientProvider>); return onNavigate }
async function waitFor(assertion: () => void) { const deadline = Date.now() + 2_000; while (true) { try { assertion(); return } catch (error) { if (Date.now() >= deadline) throw error; await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 20)) }) } } }

beforeEach(() => { ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container) })
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })

describe('HomePage', () => {
  it('shows a personal summary and sends primary actions to their existing destinations', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ documentsThisMonth: 7, totalDocuments: 24, latestDocument: null, recentActivity: [] })))
    const onNavigate = renderPage()

    await waitFor(() => expect(container.textContent).toContain('Tu resumen'))
    expect(container.textContent).toContain('7')
    expect(container.textContent).toContain('24')
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Crear documento'))!.click())
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Historial'))!.click())
    expect(onNavigate).toHaveBeenCalledWith('new-document')
    expect(onNavigate).toHaveBeenCalledWith('history')
  })

  it('shows the system scope and administration only to admins', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ documentsThisMonth: 18, totalDocuments: 124, latestDocument: null, recentActivity: [] })))
    const onNavigate = renderPage(admin)

    await waitFor(() => expect(container.textContent).toContain('Documentos este mes'))
    expect(container.textContent).toContain('Resumen del sistema')
    expect(container.textContent).toContain('Administración')
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Administración'))!.click())
    expect(onNavigate).toHaveBeenCalledWith('admin')
  })

  it('keeps work actions available when there is no activity', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ documentsThisMonth: 0, totalDocuments: 0, latestDocument: null, recentActivity: [] })))
    renderPage()

    await waitFor(() => expect(container.textContent).toContain('Todavía no hay actividad'))
    expect(container.textContent).toContain('Buscar documentos')
    expect(container.textContent).toContain('Historial')
    expect(container.textContent).not.toContain('00')
  })

  it('opens the shared global search from quick work', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ documentsThisMonth: 1, totalDocuments: 1, latestDocument: null, recentActivity: [] })))
    const openSearch = vi.fn()
    window.addEventListener('open-global-search', openSearch)
    renderPage()

    await waitFor(() => expect(container.textContent).toContain('Buscar documentos'))
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Buscar documentos'))!.click())
    expect(openSearch).toHaveBeenCalledOnce()
    window.removeEventListener('open-global-search', openSearch)
  })
})
