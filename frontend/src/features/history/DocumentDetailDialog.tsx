import { Download, FileText, LoaderCircle, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DocumentHistoryDetail, DocumentHistoryRecord } from '@/features/documents/documentsApi'

const documentTypeLabels: Record<string, string> = { PERMISO_GREMIAL: 'Permiso gremial' }

export function DocumentDetailDialog({ selected, detail, loading, error, actionError, downloading, onClose, onDownload, onPrint, onView, onUseAsBase }: {
  selected: DocumentHistoryRecord | null
  detail?: DocumentHistoryDetail
  loading: boolean
  error: boolean
  downloading: boolean
  actionError?: string
  onClose: () => void
  onDownload: () => void
  onPrint: () => void
  onView: () => void
  onUseAsBase: () => void
}) {
  return <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{detail?.publicNumber ?? selected?.publicNumber}</DialogTitle><DialogDescription>{detail ? documentTypeLabels[detail.documentType] ?? detail.documentType : 'Ficha del documento histórico'}</DialogDescription></DialogHeader>{loading ? <p className="py-10 text-center text-sm text-slate-500"><LoaderCircle className="mr-2 inline animate-spin" size={17} />Cargando información...</p> : error || !detail ? <p role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">No pudimos cargar la ficha del documento.</p> : <><div className="mt-5 flex items-center gap-2"><Badge>{documentTypeLabels[detail.documentType] ?? detail.documentType}</Badge><span className="typo-meta text-slate-500">{formatDateTime(detail.createdAt)}</span></div>{actionError && <p role="alert" className="mt-4 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{actionError}</p>}<dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-4 text-sm"><Detail label="Empresa" value={detail.companyName} /><Detail label="Delegado" value={detail.delegateName} /><Detail label="DNI" value={detail.delegateDni} /><Detail label="Convenio" value={detail.agreementCode} /><Detail label="Provincia" value={detail.provinceName} /><Detail label="Día del permiso" value={detail.permitDay == null ? '' : String(detail.permitDay)} /><Detail label="Fecha de emisión" value={formatDate(detail.issueDate)} /><Detail label="Generado por" value={detail.createdBy} /><Detail label="Generado el" value={formatDateTime(detail.createdAt)} /></dl><div className="mt-7 grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={onView} disabled={downloading}><FileText size={17} /> Ver PDF</Button><Button variant="outline" onClick={onDownload} disabled={downloading}><Download size={17} /> Descargar</Button><Button variant="outline" onClick={onPrint} disabled={downloading}><Printer size={17} /> Imprimir</Button><Button onClick={onUseAsBase}>Usar como base</Button></div></>}</DialogContent></Dialog>
}

function Detail({ label, value }: { label: string; value: string }) { return <><dt className="font-semibold text-slate-500">{label}</dt><dd className="text-right text-slate-900">{value}</dd></> }
function formatDate(date: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(`${date}T12:00:00`)) }
function formatDateTime(date: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date)) }
