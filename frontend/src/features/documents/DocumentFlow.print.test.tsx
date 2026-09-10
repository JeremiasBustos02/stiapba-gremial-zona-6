// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PdfPreview } from './DocumentFlow'

vi.mock('react-pdf', async () => {
  const { createElement } = await import('react')
  return {
    Document: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
    Page: () => createElement('div'),
    pdfjs: { GlobalWorkerOptions: {} },
  }
})

describe('PdfPreview print flow', () => {
  let container: HTMLDivElement
  let root: Root
  let createdFrame: HTMLIFrameElement
  let print: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:document-pdf')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    print = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = originalCreateElement(tagName, options)
      if (tagName.toLowerCase() === 'iframe') {
        createdFrame = element as HTMLIFrameElement
        const printWindow = new EventTarget()
        Object.defineProperty(printWindow, 'print', { value: print })
        Object.defineProperty(createdFrame, 'contentWindow', { value: printWindow, configurable: true })
      }
      return element
    })
  })

  afterEach(() => {
    act(() => root?.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('does not revoke a delayed iframe URL before the iframe can print', async () => {
    await act(async () => {
      root = createRoot(container)
      root.render(<PdfPreview pdf={new Blob(['pdf'], { type: 'application/pdf' })} onEdit={vi.fn()} onHome={vi.fn()} />)
    })

    const printButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Imprimir'))
    await act(async () => printButton?.click())

    await act(async () => vi.advanceTimersByTimeAsync(1_000))
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    await act(async () => createdFrame.dispatchEvent(new Event('load')))
    expect(print).toHaveBeenCalledOnce()
  })

  it('cleans the iframe and URL after printing', async () => {
    await act(async () => {
      root = createRoot(container)
      root.render(<PdfPreview pdf={new Blob(['pdf'], { type: 'application/pdf' })} onEdit={vi.fn()} onHome={vi.fn()} />)
    })

    const printButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Imprimir'))
    await act(async () => printButton?.click())
    await act(async () => createdFrame.dispatchEvent(new Event('load')))
    await act(async () => createdFrame.contentWindow?.dispatchEvent(new Event('afterprint')))
    await act(async () => vi.runOnlyPendingTimersAsync())

    expect(print).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    expect(document.body.contains(createdFrame)).toBe(false)
  })
})
