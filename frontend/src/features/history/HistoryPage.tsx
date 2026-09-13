import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, LoaderCircle, MoreHorizontal, Printer, Search, SlidersHorizontal, X } from 'lucide-react'
import { lazy, Suspense, useDeferredValue, useEffect, useId, useRef, useState } from 'react'
import { exportDocumentHistory, filenameFromHeaders, getDocumentHistory, getDocumentHistoryDetail, regenerateDocument, type DocumentHistoryDetail, type DocumentHistoryFilters, type DocumentHistoryRecord } from '@/features/documents/documentsApi'
import { DisabledEmailAction } from '@/features/documents/DisabledEmailAction'
import { downloadDocument, printDocument } from '@/features/documents/documentActions'
import { ApiError } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DocumentDetailDialog } from './DocumentDetailDialog'

const documentTypeLabels: Record<string, string> = { PERMISO_GREMIAL: 'Permiso gremial' }
const emptyFilters: DocumentHistoryFilters = { q: '', issueDateFrom: '', issueDateTo: '', createdBy: '', order: 'newest' }
const PdfPreview = lazy(() => import('@/features/documents/DocumentFlow').then((module) => ({ default: module.PdfPreview })))

export function HistoryPage({ role, onUseAsBase, openDocumentId, onDocumentOpened }: { role: 'ADMIN' | 'DELEGADO'; onUseAsBase?: (detail: DocumentHistoryDetail) => void; openDocumentId?: string; onDocumentOpened?: () => void }) {
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<DocumentHistoryFilters>(emptyFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const deferredQuery = useDeferredValue(filters.q ?? '')
  const [selected, setSelected] = useState<DocumentHistoryRecord | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<{ blob: Blob; filename: string; publicNumber: string } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const previewInFlight = useRef(false)
  const requestFilters = { ...filters, q: deferredQuery }
  const hasFilters = Boolean(filters.q || filters.issueDateFrom || filters.issueDateTo || filters.createdBy || filters.order === 'oldest')
  const historyQuery = useQuery({ queryKey: ['documents', 'history', page, requestFilters], queryFn: () => getDocumentHistory(page, requestFilters), placeholderData: (previous) => previous })
  const detailQuery = useQuery({ queryKey: ['documents', 'history', 'detail', selected?.id], queryFn: () => getDocumentHistoryDetail(selected!.id), enabled: Boolean(selected) })
  const errorText = historyQuery.error instanceof ApiError ? historyQuery.error.message : 'No pudimos cargar el historial. Intentá nuevamente.'

  useEffect(() => { setPage(0) }, [deferredQuery, filters.issueDateFrom, filters.issueDateTo, filters.createdBy, filters.order])
  useEffect(() => {
    if (!openDocumentId) return
    setSelected({ id: openDocumentId, publicNumber: '', documentType: 'PERMISO_GREMIAL', createdAt: '', createdBy: '', companyName: '', delegateName: '', issueDate: '' })
    onDocumentOpened?.()
  }, [openDocumentId, onDocumentOpened])
  const updateFilters = (next: Partial<DocumentHistoryFilters>) => setFilters((current) => ({ ...current, ...next }))
  const clearFilters = () => setFilters(emptyFilters)
  const download = async (record: DocumentHistoryRecord) => {
    setDownloadingId(record.id); setDownloadError('')
    try { const result = await regenerateDocument(record.id); downloadDocument(result.blob, filenameFromHeaders(result.headers)) }
    catch { setDownloadError('No pudimos descargar el PDF. Intentá nuevamente.') }
    finally { setDownloadingId(null) }
  }
  const print = async (record: DocumentHistoryRecord) => {
    setDownloadingId(record.id); setDownloadError('')
    try { const result = await regenerateDocument(record.id); printDocument(result.blob) }
    catch { setDownloadError('No pudimos preparar el PDF para imprimir. Intentá nuevamente.') }
    finally { setDownloadingId(null) }
  }
  const view = async (record: DocumentHistoryRecord) => {
    if (previewInFlight.current) return
    previewInFlight.current = true; setDownloadingId(record.id); setDownloadError('')
    try { const result = await regenerateDocument(record.id); setViewing({ blob: result.blob, filename: filenameFromHeaders(result.headers) || `${record.publicNumber}.pdf`, publicNumber: record.publicNumber }); setSelected(null) }
    catch { setDownloadError('No pudimos abrir el PDF. Intentá nuevamente.') }
    finally { previewInFlight.current = false; setDownloadingId(null) }
  }
  const exportHistory = async () => {
    if (!historyQuery.data || historyQuery.data.totalElements === 0 || exporting) return
    setExporting(true); setDownloadError('')
    try {
      const result = await exportDocumentHistory(requestFilters)
      downloadDocument(result.blob, filenameFromHeaders(result.headers) || 'historial-documentos.xlsx')
    } catch { setDownloadError('No pudimos exportar el historial. Intentá nuevamente.') }
    finally { setExporting(false) }
  }

  if (viewing) return <section className="max-w-[82rem]"><button type="button" className="typo-control mb-5 min-h-11 rounded-md px-3 text-slate-700 hover:bg-slate-100" onClick={() => setViewing(null)}>Volver al historial</button><Suspense fallback={<p role="status" className="py-10 text-center text-sm text-slate-600">Cargando vista previa...</p>}><PdfPreview pdf={viewing.blob} filename={viewing.filename} onEdit={() => setViewing(null)} onHome={() => setViewing(null)} /></Suspense></section>

  return <section className="max-w-[82rem]">
     <header className="border-b-2 border-slate-200 pb-7 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-x-8 sm:pb-8">
       <div className="border-l-4 border-blue-600 pl-4"><p className="typo-eyebrow text-blue-700">Documentos emitidos</p><h1 className="typo-display-xl mt-1 uppercase text-slate-950">Historial</h1><p className="typo-body-sm mt-3 max-w-xl text-slate-600">Buscá, filtrá y recuperá los documentos generados.</p></div>
       <div className="mt-5 sm:mt-0 sm:justify-self-end"><Button variant="outline" className="min-h-11 w-fit border-blue-200 bg-white shadow-[0_1px_2px_rgb(15_23_38/0.06)] hover:border-blue-300 hover:bg-blue-50" onClick={() => void exportHistory()} disabled={!historyQuery.data || historyQuery.data.totalElements === 0 || exporting}><FileSpreadsheet size={17} aria-hidden="true" /> {exporting ? <><LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> Exportando...</> : 'Exportar'}</Button><p aria-live="polite" className="typo-meta mt-2 tabular-nums text-slate-700 sm:text-right">{historyQuery.data ? `${historyQuery.data.totalElements} ${historyQuery.data.totalElements === 1 ? 'documento' : 'documentos'}` : ''}</p><p className="typo-meta mt-1 max-w-56 text-slate-500 sm:text-right">Se exportarán todos los documentos que coinciden con los filtros actuales.</p></div>
     </header>
     <section aria-label="Buscar y filtrar historial" className="mt-5 rounded-xl border border-slate-200 bg-slate-100/65 p-3 sm:mt-6 sm:p-4">
       <div className="flex flex-col gap-3 lg:hidden"><div className="min-w-0"><Label htmlFor="history-search">Buscar</Label><div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" /><Input id="history-search" value={filters.q} onChange={(event) => updateFilters({ q: event.target.value })} placeholder="Buscar documentos" className="h-11 border-slate-300 bg-white pl-10 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div></div><Button variant="outline" className={`min-h-11 w-fit px-3 ${hasFilters ? 'border-blue-200 bg-blue-50 text-blue-800' : 'bg-white'}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={18} aria-hidden="true" /> Filtros</Button></div>
       <div className="hidden gap-3 lg:grid lg:grid-cols-[minmax(18rem,1.8fr)_repeat(3,minmax(10rem,1fr))] lg:items-end">
         <div className="hidden lg:block"><Label htmlFor="history-search-desktop">Buscar</Label><div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" /><Input id="history-search-desktop" value={filters.q} onChange={(event) => updateFilters({ q: event.target.value })} placeholder="Número, empresa o delegado" className="h-11 border-slate-300 bg-white pl-10 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div></div>
         <div><Label htmlFor="history-from">Fecha desde</Label><Input id="history-from" className="mt-2 h-11 border-slate-300 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="date" value={filters.issueDateFrom} onChange={(event) => updateFilters({ issueDateFrom: event.target.value })} /></div>
         <div><Label htmlFor="history-to">Fecha hasta</Label><Input id="history-to" className="mt-2 h-11 border-slate-300 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="date" value={filters.issueDateTo} onChange={(event) => updateFilters({ issueDateTo: event.target.value })} /></div>
         {role === 'ADMIN' && <div><Label htmlFor="history-created-by">Generado por</Label><Input id="history-created-by" className="mt-2 h-11 border-slate-300 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filters.createdBy} onChange={(event) => updateFilters({ createdBy: event.target.value })} placeholder="Nombre" /></div>}
         <div><Label htmlFor="history-order">Orden</Label><Select id="history-order" className="mt-2 h-11 border-slate-300 bg-white hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={filters.order} onChange={(event) => updateFilters({ order: event.target.value as DocumentHistoryFilters['order'] })}><option value="newest">Más recientes</option><option value="oldest">Más antiguos</option></Select></div>
      </div>
      {hasFilters && <div className="mt-3 flex items-center justify-between gap-3"><p className="typo-meta flex items-center gap-2 text-slate-600"><SlidersHorizontal size={15} aria-hidden="true" /> Filtros activos</p><Button variant="ghost" className="min-h-9 px-2" onClick={() => { clearFilters(); setFiltersOpen(false) }}><X size={15} aria-hidden="true" /> Limpiar filtros</Button></div>}
    </section>
    {downloadError && <p role="alert" className="mt-4 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{downloadError}</p>}{downloadingId && <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600"><LoaderCircle className="animate-spin" size={16} />Preparando PDF...</p>}
    {historyQuery.isPending ? <LoadingState /> : historyQuery.isError ? <ErrorState text={errorText} onRetry={() => historyQuery.refetch()} /> : historyQuery.data.content.length === 0 ? <EmptyState role={role} filtered={hasFilters} onClear={clearFilters} /> : <>
       <div className="mt-6 hidden overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_38/0.04)] md:block"><Table><TableHeader className="bg-slate-100/80"><TableRow><TableHead className="h-11 px-4 normal-case tracking-[0.06em]">Número</TableHead><TableHead className="h-11 px-4 normal-case tracking-[0.06em]">Generación</TableHead><TableHead className="h-11 px-4 normal-case tracking-[0.06em]">Tipo</TableHead><TableHead className="h-11 px-4 normal-case tracking-[0.06em]">Empresa</TableHead><TableHead className="h-11 px-4 normal-case tracking-[0.06em]">Delegado</TableHead><TableHead className="h-11 px-4 normal-case tracking-[0.06em]">Fecha permiso</TableHead><TableHead className="h-11 px-4 text-right normal-case tracking-[0.06em]">Acciones</TableHead></TableRow></TableHeader><TableBody>{historyQuery.data.content.map((record) => <HistoryRow key={record.id} record={record} downloading={downloadingId === record.id} onDetail={() => setSelected(record)} onView={() => view(record)} onDownload={() => download(record)} />)}</TableBody></Table></div>
        <div className="mt-5 divide-y divide-slate-200 overflow-visible rounded-xl border border-slate-200 bg-white md:hidden">{historyQuery.data.content.map((record) => <HistoryItem key={record.id} record={record} downloading={downloadingId === record.id} onDetail={() => setSelected(record)} onView={() => view(record)} onDownload={() => download(record)} />)}</div>
      <Pagination page={page} totalPages={historyQuery.data.totalPages} disabled={historyQuery.isFetching} onPageChange={setPage} />
    </>}
      <DocumentDetailDialog selected={selected} detail={detailQuery.data} loading={detailQuery.isPending} error={detailQuery.isError} downloading={Boolean(selected && downloadingId === selected.id)} onClose={() => setSelected(null)} onDownload={() => selected && download(selected)} onPrint={async () => selected && print(selected)} onView={async () => selected && view(selected)} onUseAsBase={() => detailQuery.data && onUseAsBase?.(detailQuery.data)} />
     <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}><DialogContent className="bottom-sheet bottom-0 left-0 top-auto max-h-[78dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-2xl border-x-0 border-b-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:max-w-lg lg:hidden"><DialogHeader><DialogTitle>Filtrar historial</DialogTitle><DialogDescription>Acotá los documentos que querés consultar.</DialogDescription></DialogHeader><div className="mt-6 grid gap-4"><div><Label htmlFor="history-from-mobile">Fecha desde</Label><Input id="history-from-mobile" className="mt-2" type="date" value={filters.issueDateFrom} onChange={(event) => updateFilters({ issueDateFrom: event.target.value })} /></div><div><Label htmlFor="history-to-mobile">Fecha hasta</Label><Input id="history-to-mobile" className="mt-2" type="date" value={filters.issueDateTo} onChange={(event) => updateFilters({ issueDateTo: event.target.value })} /></div>{role === 'ADMIN' && <div><Label htmlFor="history-created-by-mobile">Generado por</Label><Input id="history-created-by-mobile" className="mt-2" value={filters.createdBy} onChange={(event) => updateFilters({ createdBy: event.target.value })} placeholder="Nombre" /></div>}<div><Label htmlFor="history-order-mobile">Orden</Label><Select id="history-order-mobile" className="mt-2" value={filters.order} onChange={(event) => updateFilters({ order: event.target.value as DocumentHistoryFilters['order'] })}><option value="newest">Más recientes</option><option value="oldest">Más antiguos</option></Select></div></div><div className="mt-7 flex justify-end gap-3"><DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose><DialogClose asChild><Button>Ver resultados</Button></DialogClose></div></DialogContent></Dialog>
  </section>
}

function HistoryRow({ record, downloading, onDetail, onView, onDownload }: { record: DocumentHistoryRecord; downloading: boolean; onDetail: () => void; onView: () => void; onDownload: () => void }) { return <TableRow className="hover:bg-blue-50/70"><TableCell className="px-4 py-2.5"><button type="button" className="font-semibold tabular-nums tracking-tight text-blue-900 underline-offset-4 hover:text-blue-700 hover:underline" onClick={onDetail}>{record.publicNumber}</button></TableCell><TableCell className="px-4 py-2.5 text-slate-500">{formatDateTime(record.createdAt)}</TableCell><TableCell className="px-4 py-2.5"><Badge className="whitespace-nowrap bg-transparent px-0 py-0 font-medium text-slate-600">{documentTypeLabels[record.documentType] ?? record.documentType}</Badge></TableCell><TableCell className="px-4 py-2.5 font-semibold text-slate-800">{record.companyName}</TableCell><TableCell className="px-4 py-2.5 text-slate-700">{record.delegateName}</TableCell><TableCell className="px-4 py-2.5 text-slate-500">{formatDate(record.issueDate)}</TableCell><TableCell className="px-4 py-2.5 text-right"><HistoryActions record={record} downloading={downloading} onDetail={onDetail} onView={onView} onDownload={onDownload} /></TableCell></TableRow> }
function HistoryActions({ record, downloading, onDetail, onView, onDownload }: { record: DocumentHistoryRecord; downloading: boolean; onDetail: () => void; onView: () => void; onDownload: () => void }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeOnOutsidePointer); document.removeEventListener('keydown', closeOnEscape) }
  }, [open])

  const run = (action: () => void) => { setOpen(false); action() }
  const openFromKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>) => { if (event.key !== 'ArrowDown') return; event.preventDefault(); setOpen(true); window.requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()) }
  return <div ref={root} className="relative inline-flex text-left"><Button ref={trigger} type="button" variant="ghost" aria-label="Acciones" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} className="min-h-11 w-11 gap-1.5 border border-slate-200 bg-white px-0 text-slate-700 shadow-[0_1px_2px_rgb(15_23_38/0.04)] hover:border-blue-200 hover:bg-blue-50 md:w-auto md:px-3" onClick={() => setOpen((current) => !current)} onKeyDown={openFromKeyboard}><span className="hidden md:inline">Acciones</span><ChevronDown className={`hidden transition-transform duration-150 md:block ${open ? 'rotate-180' : ''}`} size={16} aria-hidden="true" /><MoreHorizontal className="md:hidden" size={19} aria-hidden="true" /></Button>{open && <div id={menuId} role="menu" aria-label={`Acciones de ${record.publicNumber}`} className="absolute right-0 top-[calc(100%+0.375rem)] z-20 min-w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_18px_rgb(15_23_38/0.12)]"><button type="button" role="menuitem" className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-slate-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600" onClick={() => run(onDetail)}>Ver detalle</button><button type="button" role="menuitem" className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-slate-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600" disabled={downloading} onClick={() => run(onView)}>Ver PDF</button><button type="button" role="menuitem" className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-slate-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={downloading} onClick={() => run(onDownload)}>Descargar</button><DisabledEmailAction label="Enviar" className="block [&_button]:min-h-10 [&_button]:rounded-lg [&_button]:border-0 [&_button]:px-3 [&_button]:text-left [&_button]:shadow-none" /></div>}</div>
}
function HistoryItem({ record, downloading, onDetail, onView, onDownload }: { record: DocumentHistoryRecord; downloading: boolean; onDetail: () => void; onView: () => void; onDownload: () => void }) { return <article className="px-4 py-3 transition-colors duration-150 hover:bg-blue-50/70 first:rounded-t-xl last:rounded-b-xl"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2"><button type="button" className="typo-control min-h-11 font-semibold tabular-nums tracking-tight text-blue-900 underline-offset-4 hover:text-blue-700 hover:underline" onClick={onDetail}>{record.publicNumber}</button><Badge className="whitespace-nowrap bg-transparent px-0 py-0 font-medium text-slate-600">{documentTypeLabels[record.documentType] ?? record.documentType}</Badge></div><p className="typo-label -mt-0.5 text-slate-800">{record.companyName}</p><p className="typo-body-sm mt-0.5 text-slate-600">{record.delegateName} · {formatDate(record.issueDate)}</p></div><HistoryActions record={record} downloading={downloading} onDetail={onDetail} onView={onView} onDownload={onDownload} /></div><div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2"><span className="typo-meta text-slate-500">{formatDateTime(record.createdAt)}</span><Button className="min-h-10 border-slate-200 bg-white px-3 hover:border-blue-200 hover:bg-blue-50" variant="outline" onClick={onDownload} disabled={downloading}>{downloading ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />} Descargar</Button></div></article> }
function Pagination({ page, totalPages, disabled, onPageChange }: { page: number; totalPages: number; disabled: boolean; onPageChange: (page: number) => void }) { return <div className="mt-5 flex items-center justify-between gap-3"><Button variant="outline" onClick={() => onPageChange(page - 1)} disabled={page === 0 || disabled}><ChevronLeft size={17} /> Anterior</Button><span className="text-sm font-semibold text-slate-600">Página {page + 1} de {Math.max(totalPages, 1)}</span><Button variant="outline" onClick={() => onPageChange(page + 1)} disabled={page + 1 >= totalPages || disabled}>Siguiente <ChevronRight size={17} /></Button></div> }
function LoadingState() { return <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgb(15_23_38/0.04)]"><div className="space-y-2">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full rounded-lg" />)}</div></div> }
function EmptyState({ role, filtered, onClear }: { role: 'ADMIN' | 'DELEGADO'; filtered: boolean; onClear: () => void }) { return <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center"><FileText className="mx-auto text-blue-700" /><h2 className="typo-heading-2 mt-4">{filtered ? 'No encontramos documentos con esos filtros.' : 'No hay documentos generados todavía.'}</h2><p className="mt-2 text-sm text-slate-600">{filtered ? 'Probá con otro número, fechas más amplias o limpiá los filtros.' : role === 'DELEGADO' ? 'Los documentos que generes aparecerán acá.' : 'Los documentos generados aparecerán acá.'}</p>{filtered && <Button variant="outline" className="mt-5 border-slate-300 bg-white hover:border-blue-200 hover:bg-blue-50" onClick={onClear}>Limpiar filtros</Button>}</div> }
function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) { return <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5"><div className="flex gap-3 text-rose-900"><AlertCircle className="shrink-0" size={20} /><p className="font-semibold">{text}</p></div><Button variant="outline" className="mt-4 border-rose-300 bg-white text-rose-900 hover:bg-rose-100" onClick={onRetry}>Reintentar</Button></div> }
function formatDate(date: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(`${date}T12:00:00`)) }
function formatDateTime(date: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date)) }
