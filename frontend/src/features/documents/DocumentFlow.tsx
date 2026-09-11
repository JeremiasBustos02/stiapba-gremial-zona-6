import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronRight, Download, FileText, LoaderCircle, Pencil, Printer, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { z } from 'zod'
import { ApiError } from '@/lib/api'
import { agreementAfterCompanyChange } from './companyAgreement'
import { generatePermisoGremial, getDelegates, getDocumentAgreements, getDocumentCompanies, getDocumentTemplates, getDocumentVariants, getManualFields, getProvinces, type Delegate, type GeneratedDocument, type ManualField } from './documentsApi'
import { downloadDocument } from './documentActions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ActionGroup, ActionGroupItem } from '@/components/ui/action-group'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export type DocumentFormValues = { provinceId: string; issueDate: string; companyId: string; delegateId: string; permitDay: string; agreementId: string; variantId: string; manualValues: Record<string, string> }
export const initialDocumentForm: DocumentFormValues = { provinceId: '', issueDate: new Date().toISOString().slice(0, 10), companyId: '', delegateId: '', permitDay: '', agreementId: '', variantId: '', manualValues: {} }
const formSchema = z.object({ provinceId: z.string().min(1, 'Seleccioná una provincia.'), issueDate: z.string().date('La fecha de emisión no es válida.'), companyId: z.string().min(1, 'Seleccioná una empresa.'), delegateId: z.string().min(1, 'Seleccioná un delegado.'), permitDay: z.coerce.number().int().min(1, 'El día debe estar entre 1 y 31.').max(31, 'El día debe estar entre 1 y 31.'), agreementId: z.string().min(1, 'Seleccioná un convenio.'), variantId: z.string().min(1, 'Seleccioná una versión del documento.') })

function PageIntro({ title, description, context = 'Nuevo documento', step }: { title: string; description: string; context?: string; step?: string }) {
  const currentStep = step ? Number(step.match(/\d+/)?.[0]) : 0
  const stepName = currentStep === 1 ? 'Plantilla' : currentStep === 2 ? 'Variante' : 'Datos'
  return <header className="max-w-3xl"><div className="flex items-center justify-between gap-3"><p className="typo-eyebrow text-blue-700">{context}</p>{step && <><span className="sr-only">{step}</span><span aria-hidden="true" className="typo-caption hidden rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 sm:inline">{step}</span></>}</div>{step && <div className="mt-3 sm:hidden"><div aria-hidden="true" className="flex items-center"><i className="h-2.5 w-2.5 rounded-full bg-blue-700" /><span className={`h-0.5 flex-1 ${currentStep >= 2 ? 'bg-blue-700' : 'bg-slate-300'}`} /><i className={`h-2.5 w-2.5 rounded-full ${currentStep >= 2 ? 'bg-blue-700' : 'bg-slate-300'}`} /><span className={`h-0.5 flex-1 ${currentStep >= 3 ? 'bg-blue-700' : 'bg-slate-300'}`} /><i className={`h-2.5 w-2.5 rounded-full ${currentStep >= 3 ? 'bg-blue-700' : 'bg-slate-300'}`} /></div><p className="typo-meta mt-2 text-slate-600">Paso {currentStep} de 3 · {stepName}</p></div>}<h1 className="typo-heading-1 mt-1.5 sm:mt-2">{title}</h1><p className="typo-body-sm mt-2 max-w-2xl text-slate-600 sm:mt-3">{description}</p></header>
}

function errorMessage(error: unknown, fallback: string) { return error instanceof ApiError ? error.message : fallback }

function QueryState({ query, emptyText, children }: { query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }; emptyText: string; children: React.ReactNode }) {
  if (query.isPending) return <p className="py-10 text-center text-sm text-slate-500"><LoaderCircle className="mr-2 inline animate-spin" size={16} />Cargando datos...</p>
  if (query.isError) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{errorMessage(query.error, 'No pudimos cargar los datos. Intentá nuevamente.')}<button type="button" onClick={() => void query.refetch()} className="mt-3 min-h-11 font-semibold underline">Reintentar</button></div>
  return children ?? <p className="rounded-xl bg-slate-100 px-4 py-10 text-center text-sm text-slate-600">{emptyText}</p>
}

function SelectionRow({ icon: Icon, title, description, onSelect }: { icon: typeof FileText; title: string; description: string; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600 sm:min-h-20 sm:px-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><Icon size={20} /></span><span className="min-w-0 flex-1"><strong className="typo-heading-3 block">{title}</strong>{description && <span className="typo-body-sm mt-0.5 block text-slate-600">{description}</span>}</span><ChevronRight className="shrink-0 text-blue-700" size={20} /></button>
}

export function DocumentTemplateSelection({ onBack, onSelect }: { onBack: () => void; onSelect: (templateId: string) => void }) {
  const query = useQuery({ queryKey: ['documents', 'templates'], queryFn: getDocumentTemplates })
  const templates = (query.data ?? []).filter((template) => template.documentType === 'PERMISO_GREMIAL')

  return <><PageIntro title="Elegí un documento" description="Seleccioná el tipo de documento que necesitás generar." step="Paso 1 de 3" /><section className="mt-6 max-w-3xl space-y-2 sm:mt-8"><QueryState query={query} emptyText="Todavía no hay tipos de documento activos para utilizar.">{templates.length ? templates.map((template) => <SelectionRow key={template.id} icon={FileText} title={template.nombre} description={template.descripcion} onSelect={() => onSelect(template.id)} />) : null}</QueryState></section><button type="button" onClick={onBack} className="mt-5 min-h-11 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:mt-8">Cancelar</button></>
}

export function DocumentVariantSelection({ templateId, onBack, onSelect }: { templateId: string | null; onBack: () => void; onSelect: (variantId: string) => void }) {
  const query = useQuery({ queryKey: ['documents', 'variants', templateId], queryFn: () => getDocumentVariants(templateId!), enabled: Boolean(templateId) })
  const variants = query.data ?? []
  if (!templateId) return <><PageIntro title="Elegí una versión" description="Primero seleccioná un tipo de documento." step="Paso 2 de 3" /><button type="button" onClick={onBack} className="mt-5 min-h-11 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:mt-8">Volver</button></>

  return <><PageIntro title="Elegí una versión" description="Seleccioná la firma que se utilizará en el documento." step="Paso 2 de 3" /><section className="mt-6 max-w-3xl space-y-2 sm:mt-8"><QueryState query={query} emptyText="No hay versiones activas disponibles para este documento.">{variants.length ? variants.map((variant) => <SelectionRow key={variant.id} icon={Pencil} title={variant.nombre} description="Versión activa del documento." onSelect={() => onSelect(variant.id)} />) : null}</QueryState></section><button type="button" onClick={onBack} className="mt-5 min-h-11 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:mt-8">Volver</button></>
}

export function PermisoGremialForm({ value, onChange, onBack, onGenerated, editing = false, title = editing ? 'Editar documento' : 'Completar datos', description = editing ? 'Modificá los datos y actualizá la vista previa.' : 'Completá los datos necesarios para generar la vista previa.', submitLabel = editing ? 'Actualizar documento' : 'Generar vista previa' }: { value: DocumentFormValues; onChange: (value: DocumentFormValues) => void; onBack: () => void; onGenerated: (document: GeneratedDocument) => void; editing?: boolean; title?: string; description?: string; submitLabel?: string }) {
  const provincesQuery = useQuery({ queryKey: ['documents', 'provinces'], queryFn: getProvinces })
  const companiesQuery = useQuery({ queryKey: ['documents', 'companies'], queryFn: getDocumentCompanies })
  const delegatesQuery = useQuery({ queryKey: ['documents', 'delegates'], queryFn: getDelegates })
  const agreementsQuery = useQuery({ queryKey: ['documents', 'agreements'], queryFn: getDocumentAgreements })
  const manualFieldsQuery = useQuery({ queryKey: ['documents', 'manual-fields', value.variantId], queryFn: () => getManualFields(value.variantId), enabled: Boolean(value.variantId) })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const previousCompanyId = useRef(value.companyId)
  const mutation = useMutation({ mutationFn: generatePermisoGremial, onSuccess: onGenerated })
  const delegate = delegatesQuery.data?.find((item: Delegate) => item.id === value.delegateId)
  const queries = [provincesQuery, companiesQuery, delegatesQuery, agreementsQuery, manualFieldsQuery]
  const loading = queries.some((query) => query.isPending)
  const catalogError = queries.find((query) => query.isError)
  const catalogsEmpty = !loading && !catalogError && [provincesQuery.data, companiesQuery.data, delegatesQuery.data, agreementsQuery.data].some((items) => !items?.length)
  const disabled = loading || Boolean(catalogError) || catalogsEmpty || mutation.isPending
  const set = (field: Exclude<keyof DocumentFormValues, 'manualValues'>, next: string) => onChange({ ...value, [field]: next })

  useEffect(() => {
    const previousId = previousCompanyId.current
    previousCompanyId.current = value.companyId
    const agreementId = agreementAfterCompanyChange(companiesQuery.data ?? [], previousId, value.companyId, value.agreementId)
    if (agreementId !== value.agreementId) onChange({ ...value, agreementId })
  }, [companiesQuery.data, onChange, value])

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = formSchema.safeParse(value)
    if (!result.success) { setErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); return }
    const manualErrors = Object.fromEntries((manualFieldsQuery.data ?? []).filter((field) => field.required && !value.manualValues[field.id]?.trim()).map((field) => [`manual-${field.id}`, `${field.label} es obligatorio.`]))
    if (Object.keys(manualErrors).length) { setErrors(manualErrors); return }
    setErrors({})
    mutation.mutate({ ...result.data, permitDay: Number(result.data.permitDay), manualValues: value.manualValues })
  }

  const generationMessage = mutation.error instanceof ApiError && mutation.error.code === 'TEMPLATE_FIELDS_NOT_CONFIGURED' ? 'Esta variante todavía no está configurada para generar documentos.' : errorMessage(mutation.error, 'No pudimos generar el documento. Intentá nuevamente.')

  return <><PageIntro context={editing ? 'Editar documento' : 'Nuevo documento'} title={title} description={description} step={editing ? undefined : 'Paso 3 de 3'} />{mutation.isPending && <div role="status" aria-live="polite" className="mt-5 flex max-w-3xl items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900"><LoaderCircle className="animate-spin" size={20} />Preparando documento...</div>}{catalogError && <div role="alert" className="mt-5 max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{errorMessage(catalogError.error, 'No pudimos cargar los datos del formulario.')}<button type="button" onClick={() => queries.forEach((query) => void query.refetch())} className="mt-3 min-h-11 font-semibold underline">Reintentar</button></div>}{catalogsEmpty && <div className="mt-5 max-w-3xl rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-600">Faltan datos activos para completar el formulario. Contactá a un administrador.</div>}<form onSubmit={submit} className="mt-6 max-w-3xl"><fieldset disabled={disabled} className="disabled:opacity-60"><FormSection title="Contexto institucional"><SelectField label="Provincia" value={value.provinceId} onChange={(next) => set('provinceId', next)} options={(provincesQuery.data ?? []).map((item) => [item.id, item.name])} placeholder="Seleccioná una provincia" error={errors.provinceId} /><SelectField label="Empresa" value={value.companyId} onChange={(next) => set('companyId', next)} options={(companiesQuery.data ?? []).map((item) => [item.id, item.nombre])} placeholder="Seleccioná una empresa" error={errors.companyId} /></FormSection><FormSection title="Información del delegado"><SelectField label="Delegado" value={value.delegateId} onChange={(next) => set('delegateId', next)} options={(delegatesQuery.data ?? []).map((item) => [item.id, `${item.nombre} ${item.apellido}`])} placeholder="Seleccioná un delegado" error={errors.delegateId} /><div className="mt-4 rounded-xl bg-slate-100 px-4 py-3"><p className="typo-caption font-semibold uppercase tracking-wide text-slate-500">DNI del delegado</p><p className="mt-1 font-medium text-slate-800">{delegate?.dni ?? 'Se completa al seleccionar un delegado'}</p></div></FormSection><FormSection title="Datos del permiso"><label className="block text-sm font-semibold">Fecha de emisión<input required type="date" value={value.issueDate} onChange={(event) => set('issueDate', event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />{errors.issueDate && <span className="mt-1 block text-sm text-rose-700">{errors.issueDate}</span>}</label><label className="mt-4 block text-sm font-semibold">Día de permiso gremial<input required type="number" min="1" max="31" value={value.permitDay} onChange={(event) => set('permitDay', event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />{errors.permitDay && <span className="mt-1 block text-sm text-rose-700">{errors.permitDay}</span>}</label><SelectField label="Convenio" value={value.agreementId} onChange={(next) => set('agreementId', next)} options={(agreementsQuery.data ?? []).map((item) => [item.id, `${item.codigo ? `${item.codigo} — ` : ''}${item.descripcion}`])} placeholder="Seleccioná un convenio" error={errors.agreementId} /><div className="mt-4 rounded-xl bg-slate-100 px-4 py-3"><p className="typo-caption font-semibold uppercase tracking-wide text-slate-500">Versión del documento</p><p className="mt-1 font-medium text-slate-800">Seleccionada</p></div>{(manualFieldsQuery.data ?? []).map((field) => <ManualFieldInput key={field.id} field={field} value={value.manualValues[field.id] ?? ''} error={errors[`manual-${field.id}`]} onChange={(next) => onChange({ ...value, manualValues: { ...value.manualValues, [field.id]: next } })} />)}</FormSection></fieldset>{mutation.error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{generationMessage}</p>}<div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onBack} disabled={mutation.isPending} className="min-h-12 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{editing ? 'Cancelar edición' : 'Volver'}</button><button type="submit" disabled={disabled} className="min-h-12 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{mutation.isPending && <LoaderCircle className="animate-spin" size={19} />}{mutation.isPending ? 'Preparando documento...' : submitLabel}</button></div></form></>
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-b border-slate-200 py-5 first:pt-0 last:border-b-0"><h2 className="typo-eyebrow text-slate-600">{title}</h2><div className="mt-4">{children}</div></section> }
function FieldMessage({ id, message }: { id: string; message?: string }) { return message ? <p id={id} className="typo-body-sm mt-1.5 text-rose-700">{message}</p> : null }
function SelectField({ label, value, onChange, options, placeholder, error }: { label: string; value: string; onChange: (value: string) => void; options: string[][]; placeholder: string; error?: string }) {
  const id = `document-${label.toLowerCase().replaceAll(' ', '-')}`
  const errorId = `${id}-error`
  return <div className="mt-4 first:mt-0"><Label htmlFor={id}>{label}</Label><Select id={id} required value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="mt-2"><option value="">{placeholder}</option>{options.map(([optionId, text]) => <option key={optionId} value={optionId}>{text}</option>)}</Select><FieldMessage id={errorId} message={error} /></div>
}
function ManualFieldInput({ field, value, error, onChange }: { field: ManualField; value: string; error?: string; onChange: (value: string) => void }) {
  const id = `manual-${field.id}`
  const errorId = `${id}-error`
  const type = field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'
  return <div className="mt-4 first:mt-0"><Label htmlFor={id}>{field.label}</Label><Input id={id} required={field.required} type={type} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="mt-2" /><FieldMessage id={errorId} message={error} /></div>
}

export function PdfPreview({ pdf, filename = '', onEdit, onHome, postGenerationAction }: { pdf: Blob | null; filename?: string; onEdit: () => void; onHome: () => void; postGenerationAction?: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const printCleanup = useRef<(() => void) | null>(null)
  const [fitWidth, setFitWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [previewError, setPreviewError] = useState('')

  useEffect(() => {
    const element = host.current
    if (!element) return
    const updateWidth = () => setFitWidth(Math.max(0, Math.floor(element.clientWidth - 16)))
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => { setZoom(1); setPageCount(0); setPreviewError('') }, [pdf])
  useEffect(() => () => printCleanup.current?.(), [])

  const pageWidth = Math.floor(fitWidth * zoom)
  const changeZoom = (amount: number) => setZoom((current) => Math.min(2.5, Math.max(0.5, Number((current + amount).toFixed(2)))))
  const download = () => { if (pdf && filename) downloadDocument(pdf, filename) }
  const print = () => {
    if (!pdf) return
    printCleanup.current?.()
    const printUrl = URL.createObjectURL(pdf)
    const frame = document.createElement('iframe')
    let cleanupTimer: number | undefined
    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer)
      frame.onload = null
      frame.onerror = null
      frame.contentWindow?.removeEventListener('afterprint', cleanup)
      frame.remove()
      URL.revokeObjectURL(printUrl)
      if (printCleanup.current === cleanup) printCleanup.current = null
    }
    printCleanup.current = cleanup
    frame.style.display = 'none'
    frame.onload = () => {
      frame.contentWindow?.addEventListener('afterprint', cleanup, { once: true })
      frame.contentWindow?.print()
      cleanupTimer = window.setTimeout(cleanup, 1_000)
    }
    frame.onerror = cleanup
    frame.src = printUrl
    document.body.appendChild(frame)
  }

  return <><PageIntro context="Documento generado" title="Vista previa" description="Revisá el documento antes de finalizar." />{previewError ? <p role="alert" className="mt-5 max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{previewError}</p> : <section ref={host} className="mt-5 max-w-3xl min-w-0 overflow-auto overscroll-contain rounded-2xl border border-slate-300 bg-slate-200 p-2 sm:mt-7 sm:p-4" style={{ maxHeight: 'min(62dvh, 720px)', touchAction: 'pan-x pan-y' }}><div className="mx-auto w-max"><Document file={pdf} loading={<p className="p-8 text-center text-sm text-slate-600">Cargando vista previa...</p>} error={<p className="p-8 text-center text-sm text-rose-800">No pudimos visualizar el PDF generado.</p>} onLoadSuccess={({ numPages }) => { setPageCount(numPages); setPreviewError('') }} onLoadError={() => setPreviewError('No pudimos visualizar el PDF generado.')}>{Array.from({ length: pageCount }, (_, index) => <Page key={index + 1} pageNumber={index + 1} width={pageWidth || undefined} renderTextLayer={false} className="mb-3 last:mb-0 shadow-lg" />)}</Document></div></section>}<section className="mt-3 max-w-3xl rounded-xl border border-slate-200 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-1"><button type="button" onClick={() => changeZoom(-0.25)} disabled={zoom <= 0.5} aria-label="Alejar" className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"><ZoomOut size={19} /></button><span className="min-w-14 text-center text-sm font-semibold tabular-nums">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => changeZoom(0.25)} disabled={zoom >= 2.5} aria-label="Acercar" className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"><ZoomIn size={19} /></button><button type="button" onClick={() => setZoom(1)} disabled={zoom === 1} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">Ajustar</button></div><span className="px-2 typo-caption text-slate-500">{pageCount ? `${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}` : 'Preparando vista previa...'}</span></div><ActionGroup aria-label="Acciones del documento" className="mt-3"><ActionGroupItem><button type="button" onClick={download} disabled={!pdf} className="flex min-h-12 w-full items-center justify-center gap-2 bg-blue-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"><Download size={19} /> Descargar PDF</button></ActionGroupItem><ActionGroupItem><button type="button" onClick={print} disabled={!pdf} className="flex min-h-12 w-full items-center justify-center gap-2 px-5 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"><Printer size={19} /> Imprimir</button></ActionGroupItem><ActionGroupItem><button type="button" onClick={onEdit} className="min-h-12 w-full px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50">Editar documento</button></ActionGroupItem><ActionGroupItem><button type="button" onClick={onHome} className="min-h-12 w-full px-5 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-100">Finalizar y volver al inicio</button></ActionGroupItem>{postGenerationAction && <ActionGroupItem>{postGenerationAction}</ActionGroupItem>}</ActionGroup></section></>
}
