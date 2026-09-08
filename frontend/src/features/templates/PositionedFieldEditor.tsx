import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Document, Page, pdfjs } from 'react-pdf'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'
import { createAcroformField, createPositionedField, deletePositionedField, getAcroformFields, getFieldDefinitions, getTemplateFields, getVariantPdf, updatePositionedField } from './templatesApi'
import { pdfToPreview, previewToPdf, type PdfRect } from './positionedCoordinates'
import type { AcroformField, PositionedFieldInput, TemplateField, TemplateVariant } from './types'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

type Draft = PdfRect & {
  fieldDefinitionId: string
  required: boolean
  fontSize: number
  minFontSize: number
  maxFontSize: number
  alignment: 'LEFT' | 'CENTER' | 'RIGHT'
  multiline: boolean
  id?: string
}
type Interaction = { kind: 'create' | 'move' | 'resize'; start: { x: number; y: number }; rect: PdfRect } | null

const minimumSize = 8

export function PositionedFieldEditor({ templateId, variant, onBack }: { templateId: string; variant: TemplateVariant; onBack: () => void }) {
  const client = useQueryClient()
  const [pageNumber, setPageNumber] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [interaction, setInteraction] = useState<Interaction>(null)
  const container = useRef<HTMLDivElement>(null)
  const pdfQuery = useQuery({ queryKey: ['variant-pdf', variant.id], queryFn: () => getVariantPdf(templateId, variant.id) })
  const fieldsQuery = useQuery({ queryKey: ['template-fields', variant.id], queryFn: () => getTemplateFields(templateId, variant.id) })
  const definitionsQuery = useQuery({ queryKey: ['field-definitions'], queryFn: getFieldDefinitions })
  const acroformQuery = useQuery({ queryKey: ['acroform-fields', variant.id], queryFn: () => getAcroformFields(templateId, variant.id) })
  const blobUrl = useMemo(() => pdfQuery.data ? URL.createObjectURL(pdfQuery.data) : null, [pdfQuery.data])
  const positioned = fieldsQuery.data?.filter(field => field.mode === 'POSITIONED' && field.pageNumber === pageNumber && field.id !== draft?.id) ?? []

  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }, [blobUrl])

  const save = useMutation({
    mutationFn: async () => {
      if (!draft || !container.current || !draft.fieldDefinitionId) throw new Error('Seleccioná el dato que representa el campo antes de guardar.')
      const input: PositionedFieldInput = {
        fieldDefinitionId: draft.fieldDefinitionId,
        required: draft.required,
        displayOrder: fieldsQuery.data?.length ?? 0,
        pageNumber,
        ...previewToPdf(draft, container.current.clientWidth, container.current.clientHeight, pageSize.width, pageSize.height),
        fontSize: draft.fontSize,
        minFontSize: draft.minFontSize,
        maxFontSize: draft.maxFontSize,
        alignment: draft.alignment,
        multiline: draft.multiline,
      }
      return draft.id ? updatePositionedField(templateId, variant.id, draft.id, input) : createPositionedField(templateId, variant.id, input)
    },
    onSuccess: () => { setDraft(null); void client.invalidateQueries({ queryKey: ['template-fields', variant.id] }) },
  })
  const remove = useMutation({ mutationFn: (id: string) => deletePositionedField(templateId, variant.id, id), onSuccess: () => { setDraft(null); void client.invalidateQueries({ queryKey: ['template-fields', variant.id] }) } })

  function previewRect(field: TemplateField) {
    return pdfToPreview({ x: field.x!, y: field.y!, width: field.width!, height: field.height! }, container.current?.clientWidth ?? 1, container.current?.clientHeight ?? 1, pageSize.width, pageSize.height)
  }

  function point(event: React.PointerEvent<HTMLElement>) {
    const rect = container.current!.getBoundingClientRect()
    return { x: Math.max(0, Math.min(event.clientX - rect.left, rect.width)), y: Math.max(0, Math.min(event.clientY - rect.top, rect.height)) }
  }

  function begin(event: React.PointerEvent<HTMLElement>, kind: Interaction extends null ? never : 'create' | 'move' | 'resize', rect: PdfRect) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setInteraction({ kind, start: point(event), rect })
  }

  function startCreate(event: React.PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    const start = point(event)
    begin(event, 'create', { x: start.x, y: start.y, width: 0, height: 0 })
    setDraft({ ...start, width: 0, height: 0, fieldDefinitionId: '', required: true, fontSize: 12, minFontSize: 7, maxFontSize: 12, alignment: 'LEFT', multiline: false })
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!interaction || !container.current) return
    const current = point(event)
    const { rect, start } = interaction
    const width = container.current.clientWidth
    const height = container.current.clientHeight
    setDraft(previous => {
      if (!previous) return previous
      if (interaction.kind === 'create') return { ...previous, x: Math.min(start.x, current.x), y: Math.min(start.y, current.y), width: Math.abs(current.x - start.x), height: Math.abs(current.y - start.y) }
      if (interaction.kind === 'move') return { ...previous, x: Math.max(0, Math.min(width - rect.width, rect.x + current.x - start.x)), y: Math.max(0, Math.min(height - rect.height, rect.y + current.y - start.y)) }
      return { ...previous, width: Math.max(minimumSize, Math.min(width - rect.x, rect.width + current.x - start.x)), height: Math.max(minimumSize, Math.min(height - rect.y, rect.height + current.y - start.y)) }
    })
  }

  function select(field: TemplateField) {
    const rect = previewRect(field)
    setDraft({ ...rect, id: field.id, fieldDefinitionId: field.fieldDefinitionId, required: field.required, fontSize: field.fontSize ?? 12, minFontSize: field.minFontSize ?? 7, maxFontSize: field.maxFontSize ?? 12, alignment: field.alignment ?? 'LEFT', multiline: field.multiline ?? false })
  }

  const error = save.error instanceof ApiError ? save.error.message : save.error ? 'No pudimos guardar el campo.' : ''
  const draftLabel = definitionsQuery.data?.find(definition => definition.id === draft?.fieldDefinitionId)?.key ?? 'Nuevo campo'

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6"><header className="mx-auto mb-5 flex max-w-[1500px] items-center justify-between gap-4"><div><button onClick={onBack} className="text-sm font-semibold text-blue-700">← Volver a variantes</button><h1 className="mt-2 text-2xl font-bold">Configurar campos: {variant.nombre}</h1></div><span className="text-right text-sm text-slate-500">{save.isPending ? 'Guardando...' : draft ? 'Cambios sin guardar' : 'Sin cambios'}</span></header><div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><section className="overflow-auto rounded-xl bg-slate-300 p-4 sm:p-5">{pdfQuery.isPending && <p className="p-12 text-center">Cargando PDF...</p>}{pdfQuery.isError && <p role="alert" className="rounded bg-red-50 p-4 text-red-800">No pudimos cargar el PDF de la variante. Verificá que el archivo exista y reintentá.</p>}{blobUrl && <div className="relative mx-auto w-fit bg-white shadow-xl" ref={container} onPointerDown={startCreate} onPointerMove={move} onPointerUp={() => setInteraction(null)} onPointerCancel={() => setInteraction(null)}><Document file={blobUrl} loading="Cargando PDF..." error="No pudimos mostrar el PDF." onLoadSuccess={({ numPages }) => { setPageCount(numPages); setPageNumber(value => Math.min(value, numPages)) }}><Page pageNumber={pageNumber} width={820} renderTextLayer={false} onLoadSuccess={page => { const viewport = page.getViewport({ scale: 1 }); setPageSize({ width: viewport.width, height: viewport.height }) }} /></Document>{positioned.map(field => { const rect = previewRect(field); return <button key={field.id} type="button" onPointerDown={event => { select(field); event.stopPropagation() }} onClick={() => select(field)} style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} className="absolute border-2 border-blue-600 bg-blue-500/15 text-left text-[10px] font-bold text-blue-900">{field.fieldKey}</button> })}{draft && <div style={{ left: draft.x, top: draft.y, width: draft.width, height: draft.height }} onPointerDown={event => begin(event, 'move', draft)} className="absolute cursor-move border-2 border-amber-500 bg-amber-300/20 text-left text-[10px] font-bold text-amber-950"><span className="px-1">{draftLabel}</span><button type="button" aria-label="Redimensionar campo" onPointerDown={event => begin(event, 'resize', draft)} className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize border border-amber-900 bg-amber-500" /></div>}</div>}<div className="mt-4 flex justify-center gap-3"><button disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Anterior</button><span className="py-2 text-sm">Página {pageNumber}{pageCount ? ` de ${pageCount}` : ''}</span><button disabled={!pageCount || pageNumber >= pageCount} onClick={() => setPageNumber(pageNumber + 1)} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Siguiente</button></div></section><aside className="rounded-xl bg-white p-5 shadow-sm"><AcroformMappings templateId={templateId} variantId={variant.id} names={acroformQuery.data ?? []} definitions={definitionsQuery.data ?? []} configured={fieldsQuery.data ?? []} /><h2 className="mt-6 text-lg font-bold">Campo posicionado</h2>{draft ? <div className="mt-4 space-y-4"><label className="block text-sm font-medium">Dato del documento<select value={draft.fieldDefinitionId} onChange={event => setDraft({ ...draft, fieldDefinitionId: event.target.value })} className="mt-1 w-full rounded border p-2"><option value="">Seleccionar</option>{definitionsQuery.data?.map(definition => <option key={definition.id} value={definition.id}>{definition.key}</option>)}</select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.required} onChange={event => setDraft({ ...draft, required: event.target.checked })} /> Obligatorio</label>{error && <p className="text-sm text-red-700">{error}</p>}<div className="flex gap-2"><button onClick={() => save.mutate()} disabled={save.isPending} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Guardar</button>{draft.id && <button onClick={() => remove.mutate(draft.id!)} disabled={remove.isPending} className="rounded border border-red-700 px-4 py-2 text-sm font-semibold text-red-700">Eliminar</button>}<button onClick={() => setDraft(null)} className="rounded border px-4 py-2 text-sm">Cancelar</button></div></div> : <p className="mt-3 text-sm text-slate-600">Arrastrá sobre el PDF para crear un campo.</p>}</aside></div></main>
}

function AcroformMappings({ templateId, variantId, names, definitions, configured }: { templateId: string; variantId: string; names: AcroformField[]; definitions: { id: string; key: string }[]; configured: TemplateField[] }) {
  const client = useQueryClient()
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const mutation = useMutation({ mutationFn: ({ name, definitionId }: { name: string; definitionId: string }) => createAcroformField(templateId, variantId, { acroFieldName: name, fieldDefinitionId: definitionId, required: true, displayOrder: configured.length }), onSuccess: () => void client.invalidateQueries({ queryKey: ['template-fields', variantId] }) })
  if (!names.length) return null
  return <section><h2 className="text-lg font-bold">Campos AcroForm</h2><p className="mt-1 text-sm text-slate-600">Mapeá cada campo físico al dato lógico del Permiso Gremial.</p><div className="mt-3 space-y-3">{names.map(field => { const existing = configured.find(value => value.mode === 'ACROFORM' && value.acroFieldName === field.acroFieldName); return <label key={field.acroFieldName} className="block text-sm font-medium">{field.displayName}<span className="block text-xs font-normal text-slate-500">{field.acroFieldName}</span><select disabled={Boolean(existing)} value={mapping[field.acroFieldName] ?? existing?.fieldDefinitionId ?? ''} onChange={event => setMapping({ ...mapping, [field.acroFieldName]: event.target.value })} className="mt-1 w-full rounded border p-2"><option value="">{existing ? existing.fieldKey : 'Mapear a...'}</option>{definitions.map(definition => <option key={definition.id} value={definition.id}>{definition.key}</option>)}</select>{!existing && mapping[field.acroFieldName] && <button type="button" onClick={() => mutation.mutate({ name: field.acroFieldName, definitionId: mapping[field.acroFieldName] })} className="mt-1 text-sm font-semibold text-blue-700">Guardar mapeo</button>}</label> })}</div>{mutation.isError && <p role="alert" className="mt-3 text-sm text-red-700">No pudimos guardar el mapeo.</p>}</section>
}
