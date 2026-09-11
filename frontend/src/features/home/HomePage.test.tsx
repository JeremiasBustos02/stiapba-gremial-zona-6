// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/features/auth/authApi'
import { HomePage } from './HomePage'

let root: Root
let container: HTMLDivElement
const user: AuthUser = { id: 'user-1', nombre: 'Juan', apellido: 'Pérez', dni: '123', role: 'DELEGADO', active: true, firstLogin: false }

function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }
function renderPage(currentUser = user, onUseAsBase = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  root.render(<QueryClientProvider client={client}><HomePage user={currentUser} onNavigate={vi.fn()} onUseAsBase={onUseAsBase} /></QueryClientProvider>)
}
async function waitFor(assertion: () => void) { const deadline = Date.now() + 2_000; while (true) { try { assertion(); return } catch (error) { if (Date.now() >= deadline) throw error; await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 20)) }) } } }

beforeEach(() => { ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container) })
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals() })

describe('HomePage', () => {
  it('shows the main action, real metrics and recent activity for a delegate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ documentsThisMonth: 7, totalDocuments: 24, latestDocument: { id: '1', publicNumber: 'PG-2026-000143', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-11T10:00:00-03:00', createdBy: 'Juan Pérez', companyName: 'INFRIBA', delegateName: 'Carlos Pérez', issueDate: '2026-09-11' }, recentActivity: [{ id: '1', publicNumber: 'PG-2026-000143', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-11T10:00:00-03:00', createdBy: 'Juan Pérez', companyName: 'INFRIBA', delegateName: 'Carlos Pérez', issueDate: '2026-09-11' }] })))
    renderPage()
    await waitFor(() => expect(container.textContent).toContain('Hola, Juan'))
    await waitFor(() => expect(container.textContent).toContain('PG-2026-000143'))
    expect(container.textContent).toContain('Crear documento')
    expect(container.textContent).toContain('PG-2026-000143')
    expect(container.textContent).toContain('07')
    expect(container.textContent).toContain('24')
  })

  it('shows the first-use empty state without fake counters', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ documentsThisMonth: 0, totalDocuments: 0, latestDocument: null, recentActivity: [] })))
    renderPage()
    await waitFor(() => expect(container.textContent).toContain('Todavía no generaste documentos.'))
    expect(container.textContent).toContain('Crear primer documento')
    expect(container.textContent).not.toContain('00')
  })

  it('keeps the create action available when operational data fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 500)))
    renderPage()
    await waitFor(() => expect(container.textContent).toContain('No pudimos cargar la actividad.'))
    expect(container.textContent).toContain('Crear documento')
    expect(container.textContent).toContain('Reintentar actividad')
  })

  it('opens the latest detail and reuses its existing base action', async () => {
    const onUseAsBase = vi.fn()
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
      const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
      if (path.endsWith('/dashboard')) return Promise.resolve(response({ documentsThisMonth: 1, totalDocuments: 1, latestDocument: { id: '1', publicNumber: 'PG-2026-000143', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-11T10:00:00-03:00', createdBy: 'Juan Pérez', companyName: 'INFRIBA', delegateName: 'Carlos Pérez', issueDate: '2026-09-11' }, recentActivity: [] }))
      return Promise.resolve(response({ id: '1', publicNumber: 'PG-2026-000143', documentType: 'PERMISO_GREMIAL', createdAt: '2026-09-11T10:00:00-03:00', createdBy: 'Juan Pérez', companyName: 'INFRIBA', delegateName: 'Carlos Pérez', issueDate: '2026-09-11', templateId: 'template-1', variantId: 'variant-1', provinceName: 'Buenos Aires', delegateDni: '123', agreementCode: '771/10', permitDay: 15, provinceId: 'province-1', companyId: 'company-1', delegateId: 'delegate-1', agreementId: 'agreement-1', manualValues: {} }))
    }))
    renderPage(user, onUseAsBase)
    await waitFor(() => expect(container.textContent).toContain('PG-2026-000143'))
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('PG-2026-000143'))!.click())
    await waitFor(() => expect(document.body.textContent).toContain('Usar como base'))
    await act(async () => [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Usar como base'))!.click())
    expect(onUseAsBase).toHaveBeenCalledWith(expect.objectContaining({ variantId: 'variant-1', companyId: 'company-1' }))
  })
})
