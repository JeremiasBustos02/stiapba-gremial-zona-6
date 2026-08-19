import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronRight, Download, FileText, LoaderCircle, Pencil, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ApiError } from '@/lib/api'
import {
  generatePermisoGremial,
  getDelegates,
  getDocumentAgreements,
  getDocumentCompanies,
  getDocumentTemplates,
  getDocumentVariants,
  getProvinces,
  type Delegate,
} from './documentsApi'

export type DocumentFormValues = {
  provinceId: string
  issueDate: string
  companyId: string
  delegateId: string
  permitDay: string
  agreementId: string
  variantId: string
}

export const initialDocumentForm: DocumentFormValues = {
  provinceId: '',
  issueDate: new Date().toISOString().slice(0, 10),
  companyId: '',
  delegateId: '',
  permitDay: '',
  agreementId: '',
  variantId: '',
}

const formSchema = z.object({
  provinceId: z.string().min(1, 'Seleccioná una provincia.'),
  issueDate: z.string().min(1, 'Seleccioná la fecha de emisión.'),
  companyId: z.string().min(1, 'Seleccioná una empresa.'),
  delegateId: z.string().min(1, 'Seleccioná un delegado.'),
  permitDay: z.coerce.number().int().min(1, 'El día debe estar entre 1 y 31.').max(31, 'El día debe estar entre 1 y 31.'),
  agreementId: z.string().min(1, 'Seleccioná un convenio.'),
  variantId: z.string().min(1, 'Seleccioná una versión del documento.'),
})

type PageIntroProps = { title: string; description: string }

function PageIntro({ title, description }: PageIntroProps) {
  return <header className="max-w-2xl"><p className="text-sm font-semibold text-blue-700">Nuevo documento</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1><p className="mt-3 leading-relaxed text-slate-600">{description}</p></header>
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function QueryState({ query, emptyText, children }: { query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }; emptyText: string; children: React.ReactNode }) {
  if (query.isPending) return <p className="py-10 text-center text-sm text-slate-500"><LoaderCircle className="mr-2 inline animate-spin" size={16} />Cargando datos...</p>
  if (query.isError) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{errorMessage(query.error, 'No pudimos cargar los datos. Intentá nuevamente.')}<button type="button" onClick={() => void query.refetch()} className="mt-3 block font-semibold underline">Reintentar</button></div>
  return children ?? <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">{emptyText}</p>
}

export function DocumentTemplateSelection({ onBack, onSelect }: { onBack: () => void; onSelect: (templateId: string) => void }) {
  const templatesQuery = useQuery({ queryKey: ['documents', 'templates'], queryFn: getDocumentTemplates })
  const templates = templatesQuery.data ?? []
  return <><PageIntro title="Seleccionar documento" description="Elegí el tipo de documento que necesitás generar." /><section className="mt-8 max-w-3xl space-y-3"><QueryState query={templatesQuery} emptyText="Todavía no hay tipos de documento activos para utilizar.">{templates.length === 0 ? null : templates.map((template) => {
    const supported = template.nombre.trim().toLowerCase() === 'permiso gremial'
    return <button key={template.id} type="button" disabled={!supported} onClick={() => onSelect(template.id)} className="flex w-full items-center gap-4 rounded-2xl border border-blue-200 bg-white p-5 text-left shadow-sm hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"><span className="rounded-xl bg-blue-700 p-3 text-white"><FileText /></span><span className="flex-1"><strong className="text-lg">{template.nombre}</strong><span className="mt-1 block text-sm text-slate-600">{supported ? template.descripcion : 'Este tipo de documento todavía no está disponible.'}</span></span><ChevronRight className="text-blue-700" /></button>
  })}</QueryState></section><button type="button" onClick={onBack} className="mt-8 text-sm font-semibold text-slate-600 hover:text-slate-950">Cancelar</button></>
}

export function DocumentVariantSelection({ templateId, onBack, onSelect }: { templateId: string | null; onBack: () => void; onSelect: (variantId: string) => void }) {
  const variantsQuery = useQuery({ queryKey: ['documents', 'variants', templateId], queryFn: () => getDocumentVariants(templateId!), enabled: Boolean(templateId) })
  const variants = variantsQuery.data ?? []
  if (!templateId) return <><PageIntro title="Versión del documento" description="Primero seleccioná un tipo de documento." /><button type="button" onClick={onBack} className="mt-8 text-sm font-semibold text-slate-600">Volver</button></>
  return <><PageIntro title="Versión del documento" description="Elegí la firma que se utilizará en el Permiso Gremial." /><section className="mt-8 max-w-3xl space-y-3"><QueryState query={variantsQuery} emptyText="No hay versiones activas disponibles para este documento.">{variants.length === 0 ? null : variants.map((variant) => <button key={variant.id} type="button" onClick={() => onSelect(variant.id)} className="flex w-full items-center gap-4 rounded-2xl border border-blue-200 bg-white p-5 text-left shadow-sm hover:border-blue-500"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Pencil /></span><span className="flex-1"><strong className="text-lg">{variant.nombre}</strong><span className="mt-1 block text-sm text-slate-600">Versión activa del documento.</span></span><ChevronRight className="text-blue-700" /></button>)}</QueryState></section><button type="button" onClick={onBack} className="mt-8 text-sm font-semibold text-slate-600">Volver</button></>
}

export function PermisoGremialForm({ value, onChange, onBack, onGenerated }: { value: DocumentFormValues; onChange: (value: DocumentFormValues) => void; onBack: () => void; onGenerated: (pdf: Blob) => void }) {
  const provincesQuery = useQuery({ queryKey: ['documents', 'provinces'], queryFn: getProvinces })
  const companiesQuery = useQuery({ queryKey: ['documents', 'companies'], queryFn: getDocumentCompanies })
  const delegatesQuery = useQuery({ queryKey: ['documents', 'delegates'], queryFn: getDelegates })
  const agreementsQuery = useQuery({ queryKey: ['documents', 'agreements'], queryFn: getDocumentAgreements })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const mutation = useMutation({ mutationFn: generatePermisoGremial, onSuccess: onGenerated })
  const delegate = delegatesQuery.data?.find((item: Delegate) => item.id === value.delegateId)
  const loadingCatalogs = [provincesQuery, companiesQuery, delegatesQuery, agreementsQuery].some((query) => query.isPending)
  const catalogError = [provincesQuery, companiesQuery, delegatesQuery, agreementsQuery].find((query) => query.isError)
  const catalogsEmpty = !loadingCatalogs && !catalogError && [provincesQuery.data, companiesQuery.data, delegatesQuery.data, agreementsQuery.data].some((items) => !items?.length)
  const set = (field: keyof DocumentFormValues, next: string) => onChange({ ...value, [field]: next })
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = formSchema.safeParse(value)
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
      return
    }
    setErrors({})
    mutation.mutate({ ...result.data, permitDay: Number(result.data.permitDay) })
  }
  const retryCatalogs = () => [provincesQuery, companiesQuery, delegatesQuery, agreementsQuery].forEach((query) => void query.refetch())
  return <><PageIntro title="Permiso Gremial" description="Completá los datos necesarios para generar la vista previa." />
    {catalogError && <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{errorMessage(catalogError.error, 'No pudimos cargar los datos del formulario.')}<button type="button" onClick={retryCatalogs} className="mt-3 block font-semibold underline">Reintentar</button></div>}
    {catalogsEmpty && <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">Faltan datos activos para completar el formulario. Contactá a un administrador.</div>}
    <form onSubmit={submit} className="mt-8 max-w-3xl space-y-5"><fieldset disabled={loadingCatalogs || Boolean(catalogError) || catalogsEmpty || mutation.isPending} className="space-y-5 disabled:opacity-60"><FormSection title="Contexto institucional"><SelectField label="Provincia" value={value.provinceId} onChange={(next) => set('provinceId', next)} options={(provincesQuery.data ?? []).map((item) => [item.id, item.name])} placeholder="Seleccioná una provincia" error={errors.provinceId} /><SelectField label="Empresa" value={value.companyId} onChange={(next) => set('companyId', next)} options={(companiesQuery.data ?? []).map((item) => [item.id, item.nombre])} placeholder="Seleccioná una empresa" error={errors.companyId} /></FormSection><FormSection title="Información del delegado"><SelectField label="Delegado" value={value.delegateId} onChange={(next) => set('delegateId', next)} options={(delegatesQuery.data ?? []).map((item) => [item.id, `${item.nombre} ${item.apellido}`])} placeholder="Seleccioná un delegado" error={errors.delegateId} /><div className="mt-4 rounded-xl bg-slate-100 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">DNI del delegado</p><p className="mt-1 font-medium text-slate-800">{delegate?.dni ?? 'Se completa al seleccionar un delegado.'}</p></div></FormSection><FormSection title="Datos del permiso"><label className="block text-sm font-semibold">Fecha de emisión<input required type="date" value={value.issueDate} onChange={(event) => set('issueDate', event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />{errors.issueDate && <span className="mt-1 block text-sm text-rose-700">{errors.issueDate}</span>}</label><label className="mt-4 block text-sm font-semibold">Día de permiso gremial<input required type="number" min="1" max="31" inputMode="numeric" value={value.permitDay} onChange={(event) => set('permitDay', event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />{errors.permitDay && <span className="mt-1 block text-sm text-rose-700">{errors.permitDay}</span>}</label><SelectField label="Convenio" value={value.agreementId} onChange={(next) => set('agreementId', next)} options={(agreementsQuery.data ?? []).map((item) => [item.id, item.codigo ? `${item.codigo} — ${item.descripcion}` : item.descripcion])} placeholder="Seleccioná un convenio" error={errors.agreementId} /><div className="mt-4 rounded-xl bg-slate-100 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Versión del documento</p><p className="mt-1 font-medium text-slate-800">{value.variantId ? 'Versión seleccionada' : 'Seleccioná una versión antes de continuar.'}</p>{errors.variantId && <span className="mt-1 block text-sm text-rose-700">{errors.variantId}</span>}</div></FormSection></fieldset>{mutation.isError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage(mutation.error, 'No pudimos generar el documento. Intentá nuevamente.')}</p>}<div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onBack} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-white">Volver</button><button disabled={loadingCatalogs || Boolean(catalogError) || catalogsEmpty || mutation.isPending} className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{mutation.isPending && <LoaderCircle className="animate-spin" size={18} />}{mutation.isPending ? 'Generando documento...' : 'Generar vista previa'}</button></div></form></>
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">{title}</h2><div className="mt-5">{children}</div></section>
}

function SelectField({ label, value, onChange, options, placeholder, error }: { label: string; value: string; onChange: (value: string) => void; options: string[][]; placeholder: string; error?: string }) {
  return <label className="mt-4 block text-sm font-semibold first:mt-0">{label}<select required value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"><option value="">{placeholder}</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>{error && <span className="mt-1 block text-sm text-rose-700">{error}</span>}</label>
}

export function PdfPreview({ pdf, onEdit, onHome }: { pdf: Blob | null; onEdit: () => void; onHome: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState('')
  useEffect(() => {
    if (!pdf || pdf.type !== 'application/pdf') { setUrl(null); setPreviewError('No pudimos visualizar el PDF generado.'); return }
    const nextUrl = URL.createObjectURL(pdf)
    setUrl(nextUrl)
    setPreviewError('')
    return () => URL.revokeObjectURL(nextUrl)
  }, [pdf])
  const download = () => {
    if (!pdf) return
    const downloadUrl = URL.createObjectURL(pdf)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = 'permiso-gremial.pdf'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
  }
  const print = () => {
    if (!url) return
    const frame = document.createElement('iframe')
    frame.style.display = 'none'
    frame.src = url
    frame.onload = () => frame.contentWindow?.print()
    document.body.appendChild(frame)
    window.setTimeout(() => frame.remove(), 1_000)
  }
  return <><PageIntro title="Vista previa" description="Revisá el documento antes de descargarlo o imprimirlo." />{previewError ? <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{previewError}</p> : <section className="mt-7 h-[72vh] min-h-[520px] overflow-hidden rounded-2xl border border-slate-300 bg-slate-200"><iframe title="Vista previa del Permiso Gremial" src={url ?? undefined} className="h-full w-full" onError={() => setPreviewError('No pudimos visualizar el PDF generado.')} /></section>}<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onEdit} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-white">Volver y editar</button><button type="button" onClick={download} disabled={!pdf} className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"><Download size={19} />Descargar PDF</button><button type="button" onClick={print} disabled={!url} className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"><Printer size={19} />Imprimir</button><button type="button" onClick={onHome} className="text-sm font-semibold text-slate-600 hover:text-slate-950">Finalizar</button></div></>
}
