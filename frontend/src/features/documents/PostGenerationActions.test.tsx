// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PostGenerationActions } from './PostGenerationActions'

describe('PostGenerationActions', () => {
  let container: HTMLDivElement
  let root: Root
  const document = { blob: new Blob(['pdf'], { type: 'application/pdf' }), documentId: 'record-1', publicNumber: 'PG-2026-000001', filename: 'pg-2026-000001_permiso-gremial_ana-paz.pdf' }
  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = window.document.createElement('div'); window.document.body.appendChild(container); root = createRoot(container)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:document')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks() })
  it('shows actions and downloads the generated blob with its backend filename', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await act(async () => root.render(<PostGenerationActions document={document} onEdit={vi.fn()} onFinish={vi.fn()} />))
    expect(window.document.body.textContent).toContain('Documento generado')
    const button = [...window.document.querySelectorAll('button')].find((item) => item.textContent?.includes('Descargar PDF'))!
    await act(async () => button.click())
    expect(URL.createObjectURL).toHaveBeenCalledWith(document.blob)
    expect(click).toHaveBeenCalled()
  })
  it('uses the generated document id for email and does not navigate until an action is chosen', async () => {
    const onEdit = vi.fn(); const onFinish = vi.fn()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Correo enviado correctamente.' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await act(async () => root.render(<PostGenerationActions document={document} onEdit={onEdit} onFinish={onFinish} />))
    const mail = [...window.document.querySelectorAll('button')].find((item) => item.textContent?.includes('Enviar mail'))!
    await act(async () => mail.click())
    expect(window.document.body.textContent).toContain('Enviar documento')
    const input = window.document.querySelector<HTMLInputElement>('input[type="email"]')!
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'persona@example.com'); input.dispatchEvent(new Event('input', { bubbles: true })) })
    const send = [...window.document.querySelector('[role="dialog"]')!.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Enviar')!
    await act(async () => send.click())
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/documents/history/record-1/email')
    expect(onEdit).not.toHaveBeenCalled(); expect(onFinish).not.toHaveBeenCalled()
  })
  it('edits or finishes only when those actions are selected', async () => {
    const onEdit = vi.fn(); const onFinish = vi.fn()
    await act(async () => root.render(<PostGenerationActions document={document} onEdit={onEdit} onFinish={onFinish} />))
    const edit = [...window.document.querySelectorAll('button')].find((item) => item.textContent?.includes('Editar documento'))!
    await act(async () => edit.click())
    expect(onEdit).toHaveBeenCalledOnce(); expect(onFinish).not.toHaveBeenCalled()
  })
  it('finishes only when Finalizar is selected', async () => {
    const onFinish = vi.fn()
    await act(async () => root.render(<PostGenerationActions document={document} onEdit={vi.fn()} onFinish={onFinish} />))
    const finish = [...window.document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Finalizar')!
    await act(async () => finish.click())
    expect(onFinish).toHaveBeenCalledOnce()
  })
})
