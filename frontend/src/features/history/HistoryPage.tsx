import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ChevronLeft, ChevronRight, Download, FileText, LoaderCircle, Mail } from 'lucide-react'
import { useState } from 'react'
import { filenameFromHeaders, getDocumentHistory, regenerateDocument, type DocumentHistoryRecord } from '@/features/documents/documentsApi'
import { DocumentEmailDialog } from '@/features/documents/DocumentEmailDialog'
import { downloadDocument } from '@/features/documents/documentActions'
import { ApiError } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const documentTypeLabels: Record<string, string> = { PERMISO_GREMIAL: 'Permiso gremial' }

export function HistoryPage({ role }: { role: 'ADMIN' | 'DELEGADO' }) {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<DocumentHistoryRecord | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState('')
  const [emailRecord, setEmailRecord] = useState<DocumentHistoryRecord | null>(null)
  const [emailFeedback, setEmailFeedback] = useState('')
  const historyQuery = useQuery({ queryKey: ['documents', 'history', page], queryFn: () => getDocumentHistory(page), placeholderData: (previous) => previous })
  const errorText = historyQuery.error instanceof ApiError ? historyQuery.error.message : 'No pudimos cargar el historial. Intentá nuevamente.'

  const download = async (record: DocumentHistoryRecord) => {
    setDownloadingId(record.id)
    setDownloadError('')
    try {
      const result = await regenerateDocument(record.id)
      downloadDocument(result.blob, filenameFromHeaders(result.headers))
    } catch {
      setDownloadError('No pudimos descargar el PDF. Intentá nuevamente.')
    } finally {
      setDownloadingId(null)
    }
  }

  const openEmail = (record: DocumentHistoryRecord) => {
    setEmailFeedback('')
    setEmailRecord(record)
  }

  return <section className="max-w-6xl">
    <header className="border-b border-slate-200 pb-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Documentos</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Historial</h1>
      <p className="mt-2 text-sm text-slate-600">Consultá y descargá los documentos generados.</p>
    </header>
    {downloadError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{downloadError}</p>}
    {emailFeedback && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{emailFeedback}</p>}
    {historyQuery.isPending ? <LoadingState /> : historyQuery.isError ? <ErrorState text={errorText} onRetry={() => historyQuery.refetch()} /> : historyQuery.data.content.length === 0 ? <EmptyState role={role} /> : <>
      <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <Table><TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Generación</TableHead><TableHead>Tipo</TableHead><TableHead>Empresa</TableHead><TableHead>Delegado</TableHead><TableHead>Fecha permiso</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader><TableBody>{historyQuery.data.content.map((record) => <HistoryRow key={record.id} record={record} downloading={downloadingId === record.id} onDetail={() => setSelected(record)} onDownload={() => download(record)} onEmail={() => openEmail(record)} />)}</TableBody></Table>
      </div>
      <div className="mt-6 space-y-3 md:hidden">{historyQuery.data.content.map((record) => <HistoryCard key={record.id} record={record} downloading={downloadingId === record.id} onDetail={() => setSelected(record)} onDownload={() => download(record)} onEmail={() => openEmail(record)} />)}</div>
      <Pagination page={page} totalPages={historyQuery.data.totalPages} disabled={historyQuery.isFetching} onPageChange={setPage} />
    </>}
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>{selected && <DialogContent><DialogHeader><DialogTitle>{selected.publicNumber}</DialogTitle><DialogDescription>{documentTypeLabels[selected.documentType] ?? selected.documentType}</DialogDescription></DialogHeader><dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-4 text-sm"><Detail label="Generado por" value={selected.createdBy} /><Detail label="Generación" value={formatDateTime(selected.createdAt)} /><Detail label="Empresa" value={selected.companyName} /><Detail label="Delegado" value={selected.delegateName} /><Detail label="Fecha del permiso" value={formatDate(selected.issueDate)} /></dl><div className="mt-7 flex justify-end gap-2"><DialogClose asChild><Button variant="outline">Cerrar</Button></DialogClose><Button onClick={() => download(selected)} disabled={downloadingId === selected.id}>{downloadingId === selected.id ? <LoaderCircle className="animate-spin" size={17} /> : <Download size={17} />} Descargar PDF</Button></div></DialogContent>}</Dialog>
    <DocumentEmailDialog documentId={emailRecord?.id ?? null} publicNumber={emailRecord?.publicNumber ?? ''} open={Boolean(emailRecord)} onOpenChange={(open) => !open && setEmailRecord(null)} onSuccess={setEmailFeedback} />
  </section>
}

function HistoryRow({ record, downloading, onDetail, onDownload, onEmail }: { record: DocumentHistoryRecord; downloading: boolean; onDetail: () => void; onDownload: () => void; onEmail: () => void }) { return <TableRow><TableCell><button className="font-bold text-blue-800 underline-offset-4 hover:underline" onClick={onDetail}>{record.publicNumber}</button></TableCell><TableCell>{formatDateTime(record.createdAt)}</TableCell><TableCell><Badge>{documentTypeLabels[record.documentType] ?? record.documentType}</Badge></TableCell><TableCell>{record.companyName}</TableCell><TableCell>{record.delegateName}</TableCell><TableCell>{formatDate(record.issueDate)}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="outline" onClick={onDownload} disabled={downloading}>{downloading ? <LoaderCircle className="animate-spin" size={17} /> : <Download size={17} />} Descargar</Button><Button variant="outline" onClick={onEmail}><Mail size={17} /> Enviar por mail</Button></div></TableCell></TableRow> }
function HistoryCard({ record, downloading, onDetail, onDownload, onEmail }: { record: DocumentHistoryRecord; downloading: boolean; onDetail: () => void; onDownload: () => void; onEmail: () => void }) { return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><button className="font-bold text-blue-800" onClick={onDetail}>{record.publicNumber}</button><Badge className="mt-2">{documentTypeLabels[record.documentType] ?? record.documentType}</Badge></div><button aria-label={`Ver detalle de ${record.publicNumber}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onDetail}><FileText size={19} /></button></div><dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><Detail label="Empresa" value={record.companyName} /><Detail label="Delegado" value={record.delegateName} /><Detail label="Fecha" value={formatDate(record.issueDate)} /></dl><div className="mt-5 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onEmail}><Mail size={17} /> Enviar</Button><Button onClick={onDownload} disabled={downloading}>{downloading ? <LoaderCircle className="animate-spin" size={17} /> : <Download size={17} />} Descargar</Button></div></article> }
function Detail({ label, value }: { label: string; value: string }) { return <><dt className="font-semibold text-slate-500">{label}</dt><dd className="text-right text-slate-900">{value}</dd></> }
function Pagination({ page, totalPages, disabled, onPageChange }: { page: number; totalPages: number; disabled: boolean; onPageChange: (page: number) => void }) { return <div className="mt-5 flex items-center justify-between gap-3"><Button variant="outline" onClick={() => onPageChange(page - 1)} disabled={page === 0 || disabled}><ChevronLeft size={17} /> Anterior</Button><span className="text-sm font-semibold text-slate-600">Página {page + 1} de {Math.max(totalPages, 1)}</span><Button variant="outline" onClick={() => onPageChange(page + 1)} disabled={page + 1 >= totalPages || disabled}>Siguiente <ChevronRight size={17} /></Button></div> }
function LoadingState() { return <div className="mt-6 space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 w-full rounded-2xl" />)}</div> }
function EmptyState({ role }: { role: 'ADMIN' | 'DELEGADO' }) { return <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><FileText className="mx-auto text-slate-400" /><h2 className="mt-4 font-bold">No hay documentos generados todavía.</h2><p className="mt-2 text-sm text-slate-600">{role === 'DELEGADO' ? 'Los documentos que generes aparecerán acá.' : 'Los documentos generados aparecerán acá.'}</p></div> }
function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) { return <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6"><div className="flex gap-3 text-rose-900"><AlertCircle className="shrink-0" size={20} /><p className="font-semibold">{text}</p></div><Button variant="outline" className="mt-4 border-rose-300 text-rose-900" onClick={onRetry}>Reintentar</Button></div> }
function formatDate(date: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(`${date}T12:00:00`)) }
function formatDateTime(date: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date)) }
