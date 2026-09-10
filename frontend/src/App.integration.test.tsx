// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('react-pdf', async () => {
  const { createElement } = await import('react')
  return {
    Document: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
    Page: () => createElement('div'),
    pdfjs: { GlobalWorkerOptions: {} },
  }
})

let root: Root
let container: HTMLDivElement
let observedPathname = ''

function LocationObserver() {
  observedPathname = useLocation().pathname
  return null
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function waitFor(assertion: () => void) {
  const deadline = Date.now() + 2_000
  while (true) {
    try {
      assertion()
      return
    } catch (error) {
      if (Date.now() >= deadline) throw error
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 20))
      })
    }
  }
}

function renderApp(initialEntry: string) {
  root.render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationObserver />
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  localStorage.clear()
  observedPathname = ''
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('App critical integration flows', () => {
  it('allows an ADMIN to access the administration home', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ id: 'admin', nombre: 'Admin', apellido: 'STIA', dni: '1', role: 'ADMIN', firstLogin: false })))
    renderApp('/admin')

    await waitFor(() => {
      expect(observedPathname).toBe('/admin')
      expect(container.textContent).toContain('Gestioná el sistema')
    })
  })

  it('allows an ADMIN to access a real administration module', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
      if (path === '/api/v1/auth/me') return response({ id: 'admin', nombre: 'Admin', apellido: 'STIA', dni: '1', role: 'ADMIN', firstLogin: false })
      if (path === '/api/v1/users') return response({ content: [], totalElements: 0 })
      throw new Error(`Unexpected request: ${path}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderApp('/admin/usuarios')

    await waitFor(() => {
      expect(observedPathname).toBe('/admin/usuarios')
      expect(container.textContent).toContain('Gestioná el acceso, los roles y los datos')
      expect(container.textContent).toContain('Personas registradas')
    })
  })

  it('redirects a DELEGADO away from administration paths', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ id: 'delegate', nombre: 'Delegado', apellido: 'STIA', dni: '2', role: 'DELEGADO', firstLogin: false })))
    renderApp('/admin')

    await waitFor(() => {
      expect(observedPathname).toBe('/')
      expect(container.textContent).toContain('Hola, Delegado')
      expect(container.textContent).not.toContain('Gestioná el sistema')
    })
  })

  it('completes the first-login UI flow and returns to the normal application', async () => {
    let authMeCalls = 0
    const fetchMock = vi.fn(async (input: string | URL | Request, options?: RequestInit) => {
      const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
      if (path === '/api/v1/auth/me') {
        authMeCalls += 1
        return response(authMeCalls === 1
          ? { id: 'user', nombre: 'Nuevo', apellido: 'Usuario', dni: '3', role: 'DELEGADO', firstLogin: true }
          : { id: 'user', nombre: 'Nuevo', apellido: 'Usuario', dni: '3', role: 'DELEGADO', firstLogin: false })
      }
      if (path === '/api/v1/auth/csrf') return response({ token: 'csrf-token' })
      if (path === '/api/v1/auth/first-login/change-password') return response({ message: 'Contraseña actualizada.' })
      throw new Error(`Unexpected request: ${path} ${options?.method ?? 'GET'}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderApp('/')

    await waitFor(() => expect(container.textContent).toContain('Creá una nueva contraseña'))
    const password = container.querySelector<HTMLInputElement>('input[name="password"]')
    const confirm = container.querySelector<HTMLInputElement>('input[name="confirm"]')
    expect(password).not.toBeNull()
    expect(confirm).not.toBeNull()
    password!.value = 'new-password'
    confirm!.value = 'new-password'
    const saveButton = [...container.querySelectorAll<HTMLButtonElement>('form button')]
      .find((button) => button.textContent?.includes('Guardar contraseña'))
    expect(saveButton).not.toBeUndefined()
    await act(async () => saveButton!.click())

    await waitFor(() => {
      expect(container.textContent).toContain('Hola, Nuevo')
      expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/auth/first-login/change-password'))).toBe(true)
    })
    const passwordRequest = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/auth/first-login/change-password'))
    const passwordOptions = passwordRequest?.[1]
    expect(passwordOptions).toBeDefined()
    expect(JSON.parse(passwordOptions!.body as string)).toEqual({ newPassword: 'new-password', confirmPassword: 'new-password' })
  })

  it('recovers a persisted draft after a preview refresh and returns to the form', async () => {
    const draft = {
      version: 1,
      templateId: 'template-1',
      form: {
        provinceId: 'province-1',
        issueDate: '2026-09-10',
        companyId: 'company-1',
        delegateId: 'delegate-1',
        permitDay: '10',
        agreementId: 'agreement-1',
        variantId: 'variant-1',
        manualValues: { note: 'persisted value' },
      },
    }
    localStorage.setItem('stiapba.document-draft.v1', JSON.stringify(draft))
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const path = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost').pathname
      if (path === '/api/v1/auth/me') return response({ id: 'user', nombre: 'Delegado', apellido: 'STIA', dni: '4', role: 'DELEGADO', firstLogin: false })
      if (path.endsWith('/variants')) return response([{ id: 'variant-1', templateId: 'template-1', nombre: 'Firma A', active: true, legacyPositioned: false, createdAt: '', updatedAt: '' }])
      if (path === '/api/v1/provinces') return response([{ id: 'province-1', name: 'Buenos Aires' }])
      if (path === '/api/v1/companies') return response([{ id: 'company-1', nombre: 'Empresa', agreementId: 'agreement-1' }])
      if (path === '/api/v1/delegates') return response([{ id: 'delegate-1', nombre: 'Delegado', apellido: 'STIA', dni: '4' }])
      if (path === '/api/v1/agreements') return response([{ id: 'agreement-1', codigo: 'CCT', descripcion: 'Convenio' }])
      if (path.endsWith('/manual-fields')) return response([])
      throw new Error(`Unexpected request: ${path}`)
    }))
    renderApp('/documentos/nuevo/template-1/vista-previa')

    await waitFor(() => {
      expect(observedPathname).toBe('/documentos/nuevo/template-1/formulario')
      expect(container.querySelector('input[type="date"]')?.getAttribute('value')).toBe('2026-09-10')
      expect([...container.querySelectorAll('select')].map((select) => select.value)).toEqual([
        'province-1',
        'company-1',
        'delegate-1',
        'agreement-1',
      ])
    })
    expect(localStorage.getItem('stiapba.document-draft.v1')).not.toMatch(/password|jwt|csrf|blob/i)
  })
})
