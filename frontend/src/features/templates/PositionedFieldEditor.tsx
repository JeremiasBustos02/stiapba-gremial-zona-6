import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Document, Page, pdfjs } from 'react-pdf'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'
import { createFieldDefinition, getAcroformFields, getFieldDefinitions, getTemplateFields, getVariantPdf, replaceTemplateFields } from './templatesApi'
import { pdfToPreview, previewToPdf, type PdfRect } from './positionedCoordinates'
import { fieldConfigurationExperience } from './fieldConfigurationExperience'
import { canCreatePositionedField, canSaveFieldConfiguration, overlayLabel } from './fieldEditorState'
import type { AcroformField, FieldConfiguration, FieldDefinition, FieldDefinitionInput, TemplateField, TemplateVariant } from './types'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

type EditableField = FieldConfiguration & { clientId: string }
type Interaction = { kind: 'create' | 'move' | 'resize'; fieldId?: string; start: { x: number; y: number }; rect: PdfRect } | null
const minimumSize = 8

function fieldFromResponse(field: TemplateField): EditableField { return { ...field, clientId: field.id } }
function blankPositionedField(pageNumber: number): EditableField { return { clientId: crypto.randomUUID(), fieldDefinitionId: '', mode: 'POSITIONED', acroFieldName: null, required: true, displayOrder: 0, pageNumber, x: 0, y: 0, width: 0, height: 0, fontSize: 12, minFontSize: 7, maxFontSize: 12, alignment: 'LEFT', multiline: false } }
function snapshot(fields: EditableField[]) { return JSON.stringify(fields.map(({ clientId, ...field }) => field)) }

export function PositionedFieldEditor({ templateId, variant, onBack }: { templateId: string; variant: TemplateVariant; onBack: () => void }) {
  const client = useQueryClient()
  const [pageNumber, setPageNumber] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [fields, setFields] = useState<EditableField[]>([])
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot([]))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDocumentField, setSelectedDocumentField] = useState<string | null>(null)
  const [interaction, setInteraction] = useState<Interaction>(null)
  const [drawingMode, setDrawingMode] = useState(false)
  const [drawingRect, setDrawingRect] = useState<PdfRect | null>(null)
  const [newDataFor, setNewDataFor] = useState<{ clientId: string; acroFieldName?: string } | null>(null)
  const [saveFeedback, setSaveFeedback] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const pdfQuery = useQuery({ queryKey: ['variant-pdf', variant.id], queryFn: () => getVariantPdf(templateId, variant.id) })
  const fieldsQuery = useQuery({ queryKey: ['template-fields', variant.id], queryFn: () => getTemplateFields(templateId, variant.id) })
  const definitionsQuery = useQuery({ queryKey: ['field-definitions'], queryFn: getFieldDefinitions })
  const discoveredQuery = useQuery({ queryKey: ['acroform-fields', variant.id], queryFn: () => getAcroformFields(templateId, variant.id) })
  const blobUrl = useMemo(() => pdfQuery.data ? URL.createObjectURL(pdfQuery.data) : null, [pdfQuery.data])
  const hasDetectedFields = fieldConfigurationExperience(discoveredQuery.data?.length ?? 0) === 'FORM_FIELDS'
  const selected = fields.find((field) => field.clientId === selectedId) ?? null
  const dirty = snapshot(fields) !== savedSnapshot

  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }, [blobUrl])
  useEffect(() => {
    if (!fieldsQuery.data || dirty) return
    const next = fieldsQuery.data.map(fieldFromResponse)
    setFields(next)
    setSavedSnapshot(snapshot(next))
  }, [dirty, fieldsQuery.data])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!dirty) return Promise.resolve([])
      if (fields.some((field) => !field.fieldDefinitionId)) throw new Error('Asigná un dato a cada campo antes de guardar.')
      return replaceTemplateFields(templateId, variant.id, fields.map(({ clientId, ...field }, index) => ({ ...field, displayOrder: index })))
    },
    onSuccess: () => {
      setSavedSnapshot(snapshot(fields))
      setSaveFeedback('Campos guardados correctamente')
      void client.invalidateQueries({ queryKey: ['template-fields', variant.id] })
      void client.invalidateQueries({ queryKey: ['documents', 'manual-fields', variant.id] })
    },
    onError: () => setSaveFeedback(''),
  })
  const createDefinitionMutation = useMutation({ mutationFn: createFieldDefinition, onSuccess: (definition) => {
    setFields((current) => {
      if (!newDataFor) return current
      const existing = current.find((field) => field.clientId === newDataFor.clientId)
      if (existing) return current.map((field) => field.clientId === newDataFor.clientId ? { ...field, fieldDefinitionId: definition.id, required: definition.required } : field)
      return [...current, { clientId: newDataFor.clientId, fieldDefinitionId: definition.id, mode: 'ACROFORM', acroFieldName: newDataFor.acroFieldName ?? null, required: definition.required, displayOrder: current.length, pageNumber: null, x: null, y: null, width: null, height: null, fontSize: null, minFontSize: null, maxFontSize: null, alignment: null, multiline: null }]
    })
    setNewDataFor(null)
    void client.invalidateQueries({ queryKey: ['field-definitions'] })
  } })

  function updateField(clientId: string, patch: Partial<EditableField>) { setSaveFeedback(''); setFields((current) => current.map((field) => field.clientId === clientId ? { ...field, ...patch } : field)) }
  function upsertField(next: EditableField) { setSaveFeedback(''); setFields((current) => current.some((field) => field.clientId === next.clientId) ? current.map((field) => field.clientId === next.clientId ? next : field) : [...current, next]) }
  function removeField(clientId: string) { setSaveFeedback(''); setFields((current) => current.filter((field) => field.clientId !== clientId)); setSelectedId(null) }
  function previewRect(field: EditableField) { return pdfToPreview({ x: field.x ?? 0, y: field.y ?? 0, width: field.width ?? 0, height: field.height ?? 0 }, container.current?.clientWidth ?? 1, container.current?.clientHeight ?? 1, pageSize.width, pageSize.height) }
  function point(event: React.PointerEvent<HTMLElement>) { const rect = container.current!.getBoundingClientRect(); return { x: Math.max(0, Math.min(event.clientX - rect.left, rect.width)), y: Math.max(0, Math.min(event.clientY - rect.top, rect.height)) } }
  function begin(event: React.PointerEvent<HTMLElement>, kind: NonNullable<Interaction>['kind'], rect: PdfRect, fieldId?: string) { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setInteraction({ kind, fieldId, start: point(event), rect }) }
  function startDrawing(event: React.PointerEvent<HTMLDivElement>) { const start = point(event); begin(event, 'create', { x: start.x, y: start.y, width: 0, height: 0 }); setDrawingRect({ x: start.x, y: start.y, width: 0, height: 0 }) }
  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!interaction || !container.current) return
    const current = point(event); const { rect, start } = interaction; const width = container.current.clientWidth; const height = container.current.clientHeight
    if (interaction.kind === 'create') { setDrawingRect({ x: Math.min(start.x, current.x), y: Math.min(start.y, current.y), width: Math.abs(current.x - start.x), height: Math.abs(current.y - start.y) }); return }
    if (!interaction.fieldId) return
    const next = interaction.kind === 'move' ? { x: Math.max(0, Math.min(width - rect.width, rect.x + current.x - start.x)), y: Math.max(0, Math.min(height - rect.height, rect.y + current.y - start.y)), width: rect.width, height: rect.height } : { x: rect.x, y: rect.y, width: Math.max(minimumSize, Math.min(width - rect.x, rect.width + current.x - start.x)), height: Math.max(minimumSize, Math.min(height - rect.y, rect.height + current.y - start.y)) }
    updateField(interaction.fieldId, previewToPdf(next, width, height, pageSize.width, pageSize.height))
  }
  function finishInteraction() {
    if (interaction?.kind === 'create' && drawingRect && container.current) {
      if (canCreatePositionedField(drawingRect, minimumSize)) {
        const field = blankPositionedField(pageNumber)
        setFields((current) => [...current, { ...field, ...previewToPdf(drawingRect, container.current!.clientWidth, container.current!.clientHeight, pageSize.width, pageSize.height) }])
        setSelectedId(field.clientId)
      }
      setDrawingMode(false)
      setDrawingRect(null)
    }
    setInteraction(null)
  }
  function labelFor(id: string) { return overlayLabel(definitionsQuery.data?.find((definition) => definition.id === id)?.label) }

  const positioned = fields.filter((field) => field.mode === 'POSITIONED' && field.pageNumber === pageNumber)
  const discovered = discoveredQuery.data ?? []
  const saveError = saveMutation.error instanceof Error ? saveMutation.error.message : saveMutation.error ? 'No pudimos guardar los cambios. Intentá nuevamente.' : ''

  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-6"><header className="mx-auto mb-5 flex max-w-[1500px] flex-wrap items-center justify-between gap-4"><div><button type="button" onClick={onBack} className="text-sm font-semibold text-blue-700">← Volver a la plantilla</button><h1 className="mt-2 text-2xl font-bold">Configurar campos: {variant.nombre}</h1></div><div className="flex gap-2"><button type="button" onClick={onBack} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancelar</button><button type="button" disabled={!canSaveFieldConfiguration(dirty, saveMutation.isPending)} onClick={() => saveMutation.mutate()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{saveMutation.isPending ? 'Guardando...' : 'Guardar cambios'}</button></div></header>{saveFeedback && <p role="status" aria-live="polite" className="mx-auto mb-5 max-w-[1500px] rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{saveFeedback}</p>}{saveError && <p role="alert" className="mx-auto mb-5 max-w-[1500px] rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{saveError}</p>}<div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><section className="overflow-auto rounded-xl bg-slate-300 p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3">{hasDetectedFields ? <p className="text-sm text-slate-700">Encontramos {discovered.length} campos rellenables en este documento.</p> : <p className="max-w-lg text-sm text-slate-700">Este PDF no tiene campos rellenables. Marcá sobre el documento las zonas donde querés que el sistema complete información.</p>}{!hasDetectedFields && <button type="button" disabled={drawingMode} onClick={() => { setDrawingMode(true); setSaveFeedback('') }} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">+ Agregar campo</button>}</div>{drawingMode && <p role="status" className="mb-3 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-800">Dibujá un rectángulo sobre el documento</p>}{pdfQuery.isPending && <p className="p-12 text-center">Cargando PDF...</p>}{pdfQuery.isError && <p role="alert" className="rounded bg-rose-50 p-4 text-rose-800">No pudimos cargar el PDF de la variante.</p>}{blobUrl && <div ref={container} onPointerMove={move} onPointerUp={finishInteraction} onPointerCancel={finishInteraction} className="relative mx-auto w-fit bg-white shadow-xl"><Document file={blobUrl} loading="Cargando PDF..." error="No pudimos mostrar el PDF." onLoadSuccess={({ numPages }) => { setPageCount(numPages); setPageNumber((value) => Math.min(value, numPages)) }}><Page pageNumber={pageNumber} width={820} renderTextLayer={false} onLoadSuccess={(page) => { const viewport = page.getViewport({ scale: 1 }); setPageSize({ width: viewport.width, height: viewport.height }) }} /></Document>{hasDetectedFields && discovered.filter((field) => field.pageNumber === pageNumber && field.x !== null && field.y !== null && field.width !== null && field.height !== null).map((field) => { const configured = fields.find((value) => value.mode === 'ACROFORM' && value.acroFieldName === field.acroFieldName); const rect = pdfToPreview({ x: field.x!, y: field.y!, width: field.width!, height: field.height! }, container.current?.clientWidth ?? 1, container.current?.clientHeight ?? 1, pageSize.width, pageSize.height); const active = selectedDocumentField === field.acroFieldName; return <button key={field.acroFieldName} type="button" onClick={() => setSelectedDocumentField(field.acroFieldName)} style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} className={`absolute z-20 border-2 text-left text-[10px] font-bold ${active ? 'border-blue-800 bg-blue-500/35' : 'border-blue-600 bg-blue-500/15'} text-blue-950`}><span className="absolute -top-5 left-0 rounded bg-blue-800 px-1.5 py-0.5 text-white">{labelFor(configured?.fieldDefinitionId ?? '')}</span></button> })}{!hasDetectedFields && positioned.map((field) => { const rect = previewRect(field); return <button key={field.clientId} type="button" onPointerDown={(event) => { setSelectedId(field.clientId); begin(event, 'move', rect, field.clientId) }} style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} className={`absolute z-20 border-2 text-left text-[10px] font-bold ${selectedId === field.clientId ? 'border-blue-800 bg-blue-500/30' : 'border-blue-600 bg-blue-500/15'} text-blue-950`}><span className="absolute -top-5 left-0 rounded bg-blue-800 px-1.5 py-0.5 text-white">{labelFor(field.fieldDefinitionId)}</span></button> })}{selected && selected.mode === 'POSITIONED' && !drawingMode && (() => { const rect = previewRect(selected); return <button type="button" aria-label="Redimensionar campo" onPointerDown={(event) => begin(event, 'resize', rect, selected.clientId)} style={{ left: rect.x + rect.width - 8, top: rect.y + rect.height - 8 }} className="absolute z-30 h-4 w-4 rounded-sm bg-blue-700" /> })()}{drawingRect && <div aria-hidden="true" style={{ left: drawingRect.x, top: drawingRect.y, width: drawingRect.width, height: drawingRect.height }} className="pointer-events-none absolute z-30 border-2 border-dashed border-blue-800 bg-blue-400/25" />}{drawingMode && <div aria-label="Área para dibujar un campo" onPointerDown={startDrawing} className="absolute inset-0 z-40 cursor-crosshair" />}</div>}<div className="mt-4 flex items-center justify-between"><button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Anterior</button><span className="text-sm text-slate-600">Página {pageNumber} de {pageCount || '-'}</span><button type="button" disabled={pageNumber >= pageCount} onClick={() => setPageNumber(pageNumber + 1)} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Siguiente</button></div></section><aside className="rounded-xl bg-white p-5 shadow-sm">{hasDetectedFields ? <AcroformConfiguration names={discovered} fields={fields} definitions={definitionsQuery.data ?? []} selectedName={selectedDocumentField} onSelect={setSelectedDocumentField} onUpsert={upsertField} onRemove={removeField} onCreate={(clientId, acroFieldName) => setNewDataFor({ clientId, acroFieldName })} /> : <><h2 className="text-lg font-bold">{selected ? 'Campo seleccionado' : 'Campos del documento'}</h2>{selected?.mode === 'POSITIONED' ? <PositionedConfiguration field={selected} definitions={definitionsQuery.data ?? []} onChange={updateField} onCreate={(clientId) => setNewDataFor({ clientId })} onDelete={() => removeField(selected.clientId)} /> : <p className="mt-3 text-sm text-slate-600">Agregá o seleccioná un campo para asignarle el dato que se completará.</p>}</>}</aside></div>{newDataFor && <NewDataDialog pending={createDefinitionMutation.isPending} error={createDefinitionMutation.error} onCancel={() => setNewDataFor(null)} onCreate={(input) => createDefinitionMutation.mutate(input)} />}</main>
}

function DataSelector({ value, definitions, onChange, onCreate }: { value: string; definitions: FieldDefinition[]; onChange: (value: string) => void; onCreate: () => void }) { return <div><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Sin asignar</option>{definitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.label}</option>)}</select><button type="button" onClick={onCreate} className="mt-2 text-sm font-semibold text-blue-700">+ Crear nuevo dato</button></div> }
function PositionedConfiguration({ field, definitions, onChange, onCreate, onDelete }: { field: EditableField; definitions: FieldDefinition[]; onChange: (id: string, patch: Partial<EditableField>) => void; onCreate: (id: string) => void; onDelete: () => void }) { return <div className="mt-4 space-y-5"><label className="block text-sm font-semibold">Dato a completar<DataSelector value={field.fieldDefinitionId} definitions={definitions} onChange={(fieldDefinitionId) => { const definition = definitions.find((item) => item.id === fieldDefinitionId); onChange(field.clientId, { fieldDefinitionId, required: definition?.required ?? field.required }) }} onCreate={() => onCreate(field.clientId)} /></label><div><p className="text-sm font-semibold">Alineación</p><div className="mt-2 grid grid-cols-3 gap-2">{(['LEFT', 'CENTER', 'RIGHT'] as const).map((alignment) => <button key={alignment} type="button" onClick={() => onChange(field.clientId, { alignment })} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${field.alignment === alignment ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-300'}`}>{alignment === 'LEFT' ? 'Izquierda' : alignment === 'CENTER' ? 'Centro' : 'Derecha'}</button>)}</div></div><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={field.required} onChange={(event) => onChange(field.clientId, { required: event.target.checked })} /> Obligatorio</label><p className="text-sm text-slate-600">Tamaño: automático</p><button type="button" onClick={onDelete} className="text-sm font-semibold text-rose-700">Eliminar campo</button></div> }
function AcroformConfiguration({ names, fields, definitions, selectedName, onSelect, onUpsert, onRemove, onCreate }: { names: AcroformField[]; fields: EditableField[]; definitions: FieldDefinition[]; selectedName: string | null; onSelect: (name: string) => void; onUpsert: (field: EditableField) => void; onRemove: (id: string) => void; onCreate: (id: string, acroFieldName: string) => void }) { return <section><h2 className="text-lg font-bold">Campos del documento</h2><p className="mt-1 text-sm text-slate-600">Elegí el dato que se completará en cada campo.</p><div className="mt-5 space-y-3">{names.map((field, index) => { const existing = fields.find((value) => value.mode === 'ACROFORM' && value.acroFieldName === field.acroFieldName); const clientId = existing?.clientId ?? `acro-${field.acroFieldName}`; return <div key={field.acroFieldName} className={`rounded-lg border p-3 ${selectedName === field.acroFieldName ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}><button type="button" onClick={() => onSelect(field.acroFieldName)} className="w-full text-left text-sm font-semibold">{field.displayName || `Campo ${index + 1}`}</button><DataSelector value={existing?.fieldDefinitionId ?? ''} definitions={definitions} onChange={(fieldDefinitionId) => { if (!fieldDefinitionId && existing) onRemove(existing.clientId); else if (fieldDefinitionId) onUpsert({ ...(existing ?? { clientId, mode: 'ACROFORM', acroFieldName: field.acroFieldName, displayOrder: index, pageNumber: null, x: null, y: null, width: null, height: null, fontSize: null, minFontSize: null, maxFontSize: null, alignment: null, multiline: null }), fieldDefinitionId, required: definitions.find((definition) => definition.id === fieldDefinitionId)?.required ?? existing?.required ?? true }) }} onCreate={() => onCreate(clientId, field.acroFieldName)} /></div> })}</div></section> }
function NewDataDialog({ pending, error, onCancel, onCreate }: { pending: boolean; error: unknown; onCancel: () => void; onCreate: (input: FieldDefinitionInput) => void }) { const [label, setLabel] = useState(''); const [type, setType] = useState<FieldDefinitionInput['type']>('TEXT'); const [required, setRequired] = useState(true); const message = error instanceof ApiError ? error.message : error ? 'No pudimos crear el dato.' : ''; return <div role="dialog" aria-modal="true" aria-labelledby="new-data-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={(event) => { event.preventDefault(); onCreate({ label, type, sourceType: 'MANUAL', required }) }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="new-data-title" className="text-xl font-bold">Crear nuevo dato</h2><p className="mt-2 text-sm text-slate-600">Se completará manualmente al generar el documento.</p>{message && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{message}</p>}<label className="mt-5 block text-sm font-semibold">Nombre<input autoFocus required maxLength={200} value={label} onChange={(event) => setLabel(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="mt-4 block text-sm font-semibold">Tipo<select value={type} onChange={(event) => setType(event.target.value as FieldDefinitionInput['type'])} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3"><option value="TEXT">Texto</option><option value="DATE">Fecha</option><option value="NUMBER">Número</option></select></label><p className="mt-4 text-sm font-semibold">Origen</p><p className="mt-1 text-sm text-slate-600">Lo completa el usuario</p><label className="mt-4 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> Requerido</label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancelar</button><button disabled={pending} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Creando...' : 'Crear'}</button></div></form></div> }
