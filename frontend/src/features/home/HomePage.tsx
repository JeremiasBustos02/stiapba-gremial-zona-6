import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowUpRight, ChevronRight, Clock3, FilePlus2, History, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import type { AuthUser } from '@/features/auth/authApi'
import { filenameFromHeaders, getDashboard, getDocumentHistoryDetail, regenerateDocument, type DashboardDocument, type DocumentHistoryDetail } from '@/features/documents/documentsApi'
import { downloadDocument, printDocument } from '@/features/documents/documentActions'
import { ApiError } from '@/lib/api'
import type { Screen } from '@/navigation'
import { Button } from '@/components/ui/button'
import { DocumentDetailDialog } from '@/features/history/DocumentDetailDialog'

export function HomePage({ user, onNavigate, onUseAsBase }: {
  user: AuthUser
  onNavigate: (screen: Screen) => void
  onUseAsBase?: (detail: DocumentHistoryDetail) => void
}) {
  const dashboardQuery = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
  const [selected, setSelected] = useState<DashboardDocument | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [documentActionError, setDocumentActionError] = useState('')
  const detailQuery = useQuery({ queryKey: ['documents', 'history', 'detail', selected?.id], queryFn: () => getDocumentHistoryDetail(selected!.id), enabled: Boolean(selected) })
  const roleLabel = user.role === 'ADMIN' ? 'visión general del sistema' : 'tu actividad reciente'
  const errorText = dashboardQuery.error instanceof ApiError && dashboardQuery.error.code ? dashboardQuery.error.message : 'No pudimos cargar la actividad. Intentá nuevamente.'

  const openDetail = (document: DashboardDocument) => { setDocumentActionError(''); setSelected(document) }
  const withDocument = async (action: (result: Awaited<ReturnType<typeof regenerateDocument>>) => void) => {
    if (!selected) return
    setDownloadingId(selected.id)
    try { action(await regenerateDocument(selected.id)) }
    catch { setDocumentActionError('No pudimos preparar el PDF. Intentá nuevamente.') }
    finally { setDownloadingId(null) }
  }
  const view = () => { const popup = window.open('', '_blank'); return withDocument(({ blob }) => { const url = URL.createObjectURL(blob); if (popup) popup.location.href = url; else window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000) }) }
  const download = () => withDocument(({ blob, headers }) => downloadDocument(blob, filenameFromHeaders(headers)))
  const print = () => withDocument(({ blob }) => printDocument(blob))

  return <section className="max-w-[82rem]">
    <header className="motion-reveal border-b border-slate-200 pb-8 sm:pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
      <div>
        <p className="typo-eyebrow text-blue-700">STIA PBA · Zona 6</p>
        <h1 className="typo-display-xl mt-2 max-w-3xl uppercase">Hola, {user.nombre}</h1>
        <p className="typo-body-lg mt-4 max-w-2xl text-slate-600">Gestioná la documentación gremial con la información que ya tenés disponible.</p>
        <button type="button" onClick={() => onNavigate('new-document')} className="group mt-7 flex min-h-14 w-full items-center justify-between gap-4 bg-blue-800 px-5 text-left text-white transition-[background-color,transform] duration-200 hover:bg-blue-900 active:translate-y-px focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:mt-8 sm:w-auto sm:min-w-64 sm:px-6">
          <span className="flex items-center gap-3"><FilePlus2 size={21} aria-hidden="true" /><span className="typo-control">Crear documento</span></span><ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={21} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-8 hidden border-l border-slate-200 pl-6 lg:block"><p className="typo-eyebrow text-slate-500">Espacio de trabajo</p><p className="typo-body-sm mt-3 text-slate-600">{roleLabel}. Todo lo necesario para emitir un permiso, en un solo lugar.</p><span aria-hidden="true" className="typo-decorative mt-5 block text-[7rem] text-blue-100">06</span></div>
    </header>

    {dashboardQuery.isPending ? <DashboardLoading /> : dashboardQuery.isError ? <DashboardError text={errorText} onRetry={() => dashboardQuery.refetch()} /> : <>
      {dashboardQuery.data.latestDocument ? <div className="flex flex-col">{dashboardQuery.data.totalDocuments > 0 && <div className="order-2 mt-10 grid gap-10 border-t border-slate-200 pt-8 lg:order-1 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10"><RecentActivity documents={dashboardQuery.data.recentActivity} onOpen={openDetail} onHistory={() => onNavigate('history')} /><Metrics documentsThisMonth={dashboardQuery.data.documentsThisMonth} totalDocuments={dashboardQuery.data.totalDocuments} role={user.role} /></div>}<div className="order-1 lg:order-2"><LatestDocument document={dashboardQuery.data.latestDocument} onOpen={openDetail} onNavigate={onNavigate} /></div></div> : <EmptyDashboard onCreate={() => onNavigate('new-document')} />}
    </>}

    <section className="mt-10 border-t border-slate-200 pt-6 sm:mt-12" aria-labelledby="home-actions-title"><div className="flex items-center justify-between gap-4"><h2 id="home-actions-title" className="typo-eyebrow text-slate-500">Atajos de trabajo</h2><button type="button" onClick={() => onNavigate('history')} className="typo-control inline-flex min-h-11 items-center gap-1 text-blue-800 hover:text-blue-950">Ver historial <ChevronRight size={17} aria-hidden="true" /></button></div><div className="mt-2 flex flex-wrap gap-x-6 gap-y-1"><ActionLink icon={History} label="Consultar documentos" onClick={() => onNavigate('history')} /><ActionLink icon={UserRound} label="Mi perfil" onClick={() => onNavigate('profile')} />{user.role === 'ADMIN' && <ActionLink icon={ShieldCheck} label="Administración" onClick={() => onNavigate('admin')} />}</div></section>

    <DocumentDetailDialog selected={selected} detail={detailQuery.data} loading={detailQuery.isPending} error={detailQuery.isError} actionError={documentActionError} downloading={Boolean(selected && downloadingId === selected.id)} onClose={() => setSelected(null)} onDownload={download} onPrint={print} onView={view} onUseAsBase={() => detailQuery.data && onUseAsBase?.(detailQuery.data)} />
  </section>
}

function LatestDocument({ document, onOpen, onNavigate }: { document: DashboardDocument; onOpen: (document: DashboardDocument) => void; onNavigate: (screen: Screen) => void }) {
  return <section className="motion-reveal mt-8 border-y border-blue-200 bg-blue-50/70 px-5 py-6 [animation-delay:100ms] sm:mt-10 sm:px-8 sm:py-7" aria-labelledby="latest-document-title"><div className="flex flex-wrap items-start justify-between gap-5"><div><p id="latest-document-title" className="typo-eyebrow text-blue-800">Último documento</p><button type="button" onClick={() => onOpen(document)} className="typo-display-lg mt-3 text-left text-blue-950 underline decoration-blue-300 decoration-2 underline-offset-4 hover:decoration-blue-800">{document.publicNumber}</button><p className="typo-body-sm mt-2 text-slate-700">{document.companyName} · {document.delegateName}</p><p className="typo-meta mt-1 text-slate-500"><Clock3 className="mr-1 inline" size={14} aria-hidden="true" />{relativeTime(document.createdAt)}<span className="sr-only">. Generado el {exactDate(document.createdAt)}</span></p></div><button type="button" onClick={() => onOpen(document)} className="typo-control flex min-h-11 items-center gap-1 text-blue-800 hover:text-blue-950">Ver documento <ArrowUpRight size={17} aria-hidden="true" /></button></div><p className="typo-caption mt-5 border-t border-blue-200 pt-4 text-slate-600">Permiso gremial · fecha de emisión {formatDate(document.issueDate)}</p><button type="button" onClick={() => onNavigate('history')} className="sr-only">Abrir historial para más acciones</button></section>
}

function RecentActivity({ documents, onOpen, onHistory }: { documents: DashboardDocument[]; onOpen: (document: DashboardDocument) => void; onHistory: () => void }) {
  return <section className="motion-reveal [animation-delay:160ms]" aria-labelledby="recent-activity-title"><div className="flex items-end justify-between gap-4"><h2 id="recent-activity-title" className="typo-heading-2">Actividad reciente</h2><button type="button" onClick={onHistory} className="hidden min-h-11 items-center gap-1 text-sm font-semibold text-blue-800 hover:text-blue-950 sm:flex">Ver historial <ChevronRight size={17} aria-hidden="true" /></button></div>{documents.length ? <ol className="mt-5 border-l border-slate-300">{documents.map((document) => <li key={document.id} className="relative pl-6 pb-6 last:pb-0"><span aria-hidden="true" className="absolute -left-[0.3rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-50 bg-blue-700" /><button type="button" onClick={() => onOpen(document)} className="typo-control min-h-11 text-left text-blue-900 underline-offset-4 hover:underline">{document.publicNumber}</button><p className="typo-body-sm -mt-1 text-slate-800">{document.companyName}</p><p className="typo-meta mt-1 text-slate-500">{document.delegateName} · <time dateTime={document.createdAt} title={exactDate(document.createdAt)}>{relativeTime(document.createdAt)}</time></p></li>)}</ol> : <p className="mt-5 text-sm text-slate-600">Cuando generes documentos, aparecerán acá.</p>}<button type="button" onClick={onHistory} className="mt-6 flex min-h-11 items-center gap-1 text-sm font-semibold text-blue-800 sm:hidden">Ver historial <ChevronRight size={17} aria-hidden="true" /></button></section>
}

function Metrics({ documentsThisMonth, totalDocuments, role }: { documentsThisMonth: number; totalDocuments: number; role: AuthUser['role'] }) {
  return <aside className="motion-reveal border-t border-slate-200 pt-6 [animation-delay:220ms] lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0" aria-labelledby="metrics-title"><p id="metrics-title" className="typo-eyebrow text-slate-500">Resumen {role === 'ADMIN' ? 'del sistema' : 'personal'}</p><dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6 lg:block lg:space-y-7"><Metric label="Este mes" value={documentsThisMonth} description="documentos" /><Metric label="Total" value={totalDocuments} description="documentos" /></dl></aside>
}

function Metric({ label, value, description }: { label: string; value: number; description: string }) { return <div><dt className="typo-meta text-slate-600">{label}</dt><dd className="mt-1 flex items-baseline gap-2"><span className="typo-display-lg tabular-nums text-blue-900">{String(value).padStart(2, '0')}</span><span className="typo-caption text-slate-500">{description}</span></dd></div> }
function ActionLink({ icon: Icon, label, onClick }: { icon: typeof History; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="typo-control inline-flex min-h-11 items-center gap-2 text-slate-700 hover:text-blue-800"><Icon size={17} aria-hidden="true" />{label}</button> }
function EmptyDashboard({ onCreate }: { onCreate: () => void }) { return <section className="motion-reveal mt-8 border-y border-slate-200 py-10 sm:mt-10 sm:py-14" aria-labelledby="empty-dashboard-title"><span aria-hidden="true" className="typo-decorative float-right -mt-7 text-8xl text-blue-100">01</span><p className="typo-eyebrow text-blue-700">Primer paso</p><h2 id="empty-dashboard-title" className="typo-display-lg mt-3 max-w-xl uppercase">Todavía no generaste documentos.</h2><p className="typo-body-sm mt-3 max-w-md text-slate-600">Cuando generes tu primer permiso, tu actividad aparecerá acá.</p><button type="button" onClick={onCreate} className="mt-6 min-h-12 bg-blue-800 px-5 text-sm font-semibold text-white transition hover:bg-blue-900 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2">Crear primer documento</button></section> }
function DashboardLoading() { return <div className="mt-8 animate-pulse space-y-8" aria-label="Cargando actividad"><div className="h-44 bg-slate-200" /><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="h-56 border-y border-slate-200 bg-slate-100" /><div className="h-32 border-t border-slate-200 bg-slate-100" /></div></div> }
function DashboardError({ text, onRetry }: { text: string; onRetry: () => void }) { return <div role="alert" className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900"><span className="flex items-center gap-3"><AlertCircle size={19} aria-hidden="true" />{text}</span><Button variant="outline" onClick={onRetry}>Reintentar actividad</Button></div> }
function formatDate(date: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(`${date}T12:00:00`)) }
function exactDate(date: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date)) }
function relativeTime(date: string) { const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000); if (seconds < 60) return 'hace unos minutos'; if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`; if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`; if (seconds < 172800) return 'ayer'; return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(date)) }
