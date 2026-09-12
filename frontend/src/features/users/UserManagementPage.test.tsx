// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UserManagementPage } from './UserManagementPage'
import type { User } from './types'

const admin: User = { id: 'admin-id', nombre: 'Ana', apellido: 'Admin', dni: '30000000', role: 'ADMIN', active: true, firstLogin: false, createdAt: '', updatedAt: '' }
const activeUser: User = { id: 'delegate-id', nombre: 'Juan', apellido: 'Pérez', dni: '40123456', role: 'DELEGADO', active: true, firstLogin: false, createdAt: '', updatedAt: '' }
const inactiveUser: User = { id: 'inactive-id', nombre: 'Inés', apellido: 'Inactiva', dni: '40123457', role: 'DELEGADO', active: false, firstLogin: false, createdAt: '', updatedAt: '' }

let root: Root
let container: HTMLDivElement

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function waitFor(assertion: () => void) {
  const deadline = Date.now() + 2_000
  while (true) {
    try {
      assertion()
      return
    } catch (error) {
      if (Date.now() >= deadline) throw error
      await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 20)) })
    }
  }
}

function button(label: string) {
  const element = [...container.querySelectorAll<HTMLButtonElement>('button')].find((candidate) => candidate.textContent?.trim() === label)
  expect(element).toBeDefined()
  return element!
}

async function click(label: string) {
  await act(async () => button(label).click())
}

async function openActions(user: User) {
  const trigger = container.querySelector<HTMLButtonElement>(`button[aria-label="Acciones para ${user.nombre} ${user.apellido}"]`)
  expect(trigger).not.toBeNull()
  await act(async () => trigger!.click())
}

function renderPage() {
  root.render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><UserManagementPage currentUserId={admin.id} /></QueryClientProvider>)
}

function usersFetchMock(resetResponse: () => Promise<Response> | Response = () => response({ temporaryPassword: 'A7mK-4pQ2-Xz' })) {
  return vi.fn(async (input: string | URL | Request) => {
    const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
    if (path === '/api/v1/users') return response({ content: [admin, activeUser, inactiveUser], page: 0, size: 100, totalElements: 3, totalPages: 1 })
    if (path === '/api/v1/auth/csrf') return response({ token: 'csrf-token' })
    if (path === `/api/v1/users/${activeUser.id}/reset-password`) return resetResponse()
    throw new Error(`Unexpected request: ${path}`)
  })
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe('UserManagementPage password reset', () => {
  it('only offers password reset for active users other than the current ADMIN', async () => {
    vi.stubGlobal('fetch', usersFetchMock())
    renderPage()
    await waitFor(() => expect(container.textContent).toContain('Juan Pérez'))

    await openActions(activeUser)
    expect(container.textContent).toContain('Restablecer contraseña')
    await openActions(admin)
    expect(container.textContent).not.toContain('Restablecer contraseña')
    await openActions(inactiveUser)
    expect(container.textContent).not.toContain('Restablecer contraseña')
  })

  it('shows confirmation before the request and cancelling does not call the endpoint', async () => {
    const fetchMock = usersFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    await waitFor(() => expect(container.textContent).toContain('Juan Pérez'))

    await openActions(activeUser)
    await click('Restablecer contraseña')
    expect(container.textContent).toContain('Se generará una contraseña temporal y se cerrarán las sesiones actuales de este usuario.')
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/reset-password'))).toBe(false)
    await click('Cancelar')
    expect(container.textContent).not.toContain('Se generará una contraseña temporal y se cerrarán las sesiones actuales de este usuario.')
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/reset-password'))).toBe(false)
  })

  it('calls the reset endpoint once while the confirmation is pending', async () => {
    let resolveReset!: (value: Response) => void
    const fetchMock = usersFetchMock(() => new Promise<Response>((resolve) => { resolveReset = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    await waitFor(() => expect(container.textContent).toContain('Juan Pérez'))

    await openActions(activeUser)
    await click('Restablecer contraseña')
    await click('Restablecer')
    await waitFor(() => expect(button('Restableciendo...').disabled).toBe(true))
    await act(async () => button('Restableciendo...').click())
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith(`/users/${activeUser.id}/reset-password`))).toHaveLength(1)
    await act(async () => resolveReset(response({ temporaryPassword: 'A7mK-4pQ2-Xz' })))
  })

  it('shows the backend temporary password, copies it, and clears it when closed', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    vi.stubGlobal('fetch', usersFetchMock())
    renderPage()
    await waitFor(() => expect(container.textContent).toContain('Juan Pérez'))

    await openActions(activeUser)
    await click('Restablecer contraseña')
    await click('Restablecer')
    await waitFor(() => expect(container.textContent).toContain('A7mK-4pQ2-Xz'))
    expect(container.textContent).toContain('Contraseña temporal generada')
    expect(container.textContent).toContain('El usuario deberá cambiarla la próxima vez que ingrese.')
    await click('Copiar contraseña')
    expect(writeText).toHaveBeenCalledWith('A7mK-4pQ2-Xz')
    expect(container.textContent).toContain('Contraseña copiada')
    await click('Listo')
    expect(container.textContent).not.toContain('A7mK-4pQ2-Xz')
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it('keeps the confirmation open on error and never displays a temporary password', async () => {
    vi.stubGlobal('fetch', usersFetchMock(() => response({ message: 'No pudimos restablecer la contraseña.' }, 500)))
    renderPage()
    await waitFor(() => expect(container.textContent).toContain('Juan Pérez'))

    await openActions(activeUser)
    await click('Restablecer contraseña')
    await click('Restablecer')
    await waitFor(() => {
      expect(container.textContent).toContain('Se generará una contraseña temporal y se cerrarán las sesiones actuales de este usuario.')
      expect(container.textContent).toContain('No pudimos restablecer la contraseña.')
    })
    expect(container.textContent).not.toContain('Contraseña temporal generada')
  })
})
