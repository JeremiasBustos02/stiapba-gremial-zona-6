// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportsPage } from './ReportsPage'

let root: Root
let container: HTMLDivElement
const summary = { dateFrom: '2026-09-01', dateTo: '2026-09-30', totalDocuments: 214, uniqueDelegates: 48, uniqueCompanies: 17, uniqueAgreements: 4 }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function waitFor(assertion: () => void) { for (let attempt = 0; attempt < 100; attempt++) { try { assertion(); return } catch (error) { if (attempt === 99) throw error; await act(async () => { await vi.advanceTimersByTimeAsync(20) }) } } }
function render() { root.render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ReportsPage /></QueryClientProvider>) }
function setValue(input: HTMLInputElement, value: string) { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })) }

beforeEach(() => { ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-15T12:00:00Z')); container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container) })
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('ReportsPage', () => {
  it('renders the ADMIN reports page with the current month and summary metrics', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(summary)); vi.stubGlobal('fetch', fetchMock); render()
    await waitFor(() => expect(container.textContent).toContain('214'))
    expect(container.textContent).toContain('Reportes y exportaciones'); expect(container.textContent).toContain('48'); expect(container.textContent).toContain('17'); expect(container.textContent).toContain('4')
    expect(container.querySelector<HTMLInputElement>('#report-from')!.value).toBe('2026-09-01'); expect(container.querySelector<HTMLInputElement>('#report-to')!.value).toBe('2026-09-30')
    expect(String(fetchMock.mock.calls[0][0])).toContain('dateFrom=2026-09-01'); expect(String(fetchMock.mock.calls[0][0])).toContain('dateTo=2026-09-30')
  })

  it('blocks invalid date ranges without requesting another summary or export', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(summary)); vi.stubGlobal('fetch', fetchMock); render(); await waitFor(() => expect(container.textContent).toContain('214'))
    await act(async () => setValue(container.querySelector('#report-from')!, '2026-10-01'))
    expect(container.textContent).toContain('La fecha desde no puede ser posterior a la fecha hasta.')
    expect([...container.querySelectorAll('button')].find(button => button.textContent?.includes('Actualizar resumen'))?.disabled).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state, disables the period report, and keeps quick exports available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...summary, totalDocuments: 0, uniqueDelegates: 0, uniqueCompanies: 0, uniqueAgreements: 0 }))); render()
    await waitFor(() => expect(container.textContent).toContain('No hay actividad en este período.'))
    expect(container.querySelector('[aria-labelledby="summary-title"]')).toBeNull()
    expect([...container.querySelectorAll('button')].find(button => button.textContent?.includes('Descargar Excel'))?.disabled).toBe(true)
    const companies = [...container.querySelectorAll('button')].find(button => button.closest('div')?.textContent?.includes('Empresas') && button.textContent?.includes('Exportar'))
    expect(companies?.disabled).toBe(false)
  })

  it('downloads the report with current dates, supplied filename, and prevents duplicate submissions', async () => {
    let resolveExport: (value: Response) => void = () => {}; const clicks: string[] = []
    const fetchMock = vi.fn((input: string | URL | Request) => String(input).includes('/reports/export') ? new Promise<Response>(resolve => { resolveExport = resolve }) : Promise.resolve(json(summary)))
    vi.stubGlobal('fetch', fetchMock); Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:report') }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() }); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicks.push(this.download) }); render()
    await waitFor(() => expect(container.textContent).toContain('214')); const button = [...container.querySelectorAll('button')].find(item => item.textContent?.includes('Descargar Excel'))!
    await act(async () => button.click()); await waitFor(() => expect(button.disabled).toBe(true)); await act(async () => button.click())
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes('/reports/export'))).toHaveLength(1)
    await act(async () => resolveExport(new Response('xlsx', { headers: { 'Content-Disposition': 'attachment; filename="reporte.xlsx"' } }))); await waitFor(() => expect(clicks).toEqual(['reporte.xlsx']))
    expect(String(fetchMock.mock.calls.find(([input]) => String(input).includes('/reports/export'))![0])).toContain('dateFrom=2026-09-01')
  })

  it('uses a safe filename fallback and exports companies from the quick action', async () => {
    const clicks: string[] = []; const fetchMock = vi.fn((input: string | URL | Request) => String(input).includes('/exports/companies') ? Promise.resolve(new Response('xlsx')) : Promise.resolve(json(summary)))
    vi.stubGlobal('fetch', fetchMock); Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:companies') }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() }); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicks.push(this.download) }); render()
    await waitFor(() => expect(container.textContent).toContain('214')); const companies = [...container.querySelectorAll('button')].find(button => button.closest('div')?.textContent?.includes('Empresas') && button.textContent?.includes('Exportar'))!
    await act(async () => companies.click()); await waitFor(() => expect(clicks).toEqual(['companies.xlsx'])); expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/admin/exports/companies'))).toBe(true)
  })

  it('keeps a recoverable error visible when the summary request fails', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 500))); render(); await waitFor(() => expect(container.textContent).toContain('No pudimos completar la operación.')); expect(container.textContent).toContain('Reintentar') })
})
