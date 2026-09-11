// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./searchApi', () => ({ searchGlobal: vi.fn() }))

import { GlobalSearch } from './GlobalSearch'

let root: Root
let container: HTMLDivElement

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks() })

describe('GlobalSearch', () => {
  it('opens with Ctrl+K or the shared search event, then closes with Escape', async () => {
    await act(async () => root.render(<QueryClientProvider client={new QueryClient()}><GlobalSearch role="DELEGADO" onNavigate={vi.fn()} onOpenDocument={vi.fn()} onPrefill={vi.fn()} /></QueryClientProvider>))

    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })))
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Buscar"]')).not.toBeNull()

    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    await act(async () => window.dispatchEvent(new Event('open-global-search')))
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })
})
