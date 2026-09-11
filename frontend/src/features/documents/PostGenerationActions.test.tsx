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

  it('shows only the inline email action and no automatic actions dialog', async () => {
    await act(async () => root.render(<PostGenerationActions document={generatedDocument} />))

    expect(container.textContent).toContain('Enviar mail')
    expect(container.textContent).not.toContain('Documento generado')
    expect(window.document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('opens the email dialog only after selecting email and sends editable fields', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Correo enviado correctamente.' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const onSuccess = vi.fn()
    await act(async () => root.render(<PostGenerationActions document={generatedDocument} onSuccess={onSuccess} />))

    const mail = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes('Enviar mail'))!
    await act(async () => mail.click())
    expect(window.document.body.textContent).toContain('Enviar documento')
    const dialog = window.document.querySelector('[role="dialog"]')!
    const inputs = dialog.querySelectorAll<HTMLInputElement>('input')
    const message = dialog.querySelector<HTMLTextAreaElement>('textarea')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(inputs[0], 'uno@example.com, dos@example.com')
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(inputs[1], 'Asunto editado')
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(message, 'Mensaje editado')
      message.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const send = [...dialog.querySelectorAll('button')].find((item) => item.textContent?.includes('Enviar correo'))!
    await act(async () => send.click())

    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/documents/history/record-1/email')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({
      recipients: ['uno@example.com', 'dos@example.com'], subject: 'Asunto editado', message: 'Mensaje editado',
    })
    expect(onSuccess).toHaveBeenCalledWith('Correo enviado correctamente.')
  })

  it('validates recipients without requesting the backend', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await act(async () => root.render(<PostGenerationActions document={generatedDocument} />))
    await act(async () => [...container.querySelectorAll('button')].find((item) => item.textContent?.includes('Enviar mail'))!.click())
    const dialog = window.document.querySelector('[role="dialog"]')!
    await act(async () => [...dialog.querySelectorAll('button')].find((item) => item.textContent?.includes('Enviar correo'))!.click())
    expect(window.document.body.textContent).toContain('Ingresá uno o más correos electrónicos válidos')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
