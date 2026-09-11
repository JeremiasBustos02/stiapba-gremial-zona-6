// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PostGenerationActions } from './PostGenerationActions'

describe('PostGenerationActions', () => {
  let container: HTMLDivElement
  let root: Root
  const generatedDocument = { blob: new Blob(['pdf'], { type: 'application/pdf' }), documentId: 'record-1', publicNumber: 'PG-2026-000001', filename: 'pg-2026-000001_permiso-gremial_ana-paz.pdf' }

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = window.document.createElement('div'); window.document.body.appendChild(container); root = createRoot(container)
  })
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('shows the email action as disabled without opening a dialog', async () => {
    await act(async () => root.render(<PostGenerationActions document={generatedDocument} />))

    const button = container.querySelector('button')!
    expect(button.textContent).toContain('Enviar por mail')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(container.querySelector('[role="group"]')).not.toBeNull()
    expect(window.document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('shows the temporary availability message and never calls the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await act(async () => root.render(<PostGenerationActions document={generatedDocument} />))

    await act(async () => container.querySelector('button')!.click())

    expect(window.document.body.textContent).toContain('Envío por correo temporalmente deshabilitado')
    expect(window.document.body.textContent).toContain('Estamos terminando de configurar esta función')
    expect(container.querySelector('[role="tooltip"]')).toBeNull()
    expect(window.document.body.querySelector('[role="tooltip"]')).not.toBeNull()
    expect(window.document.querySelector('[role="dialog"]')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
