import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '@/lib/api'
import {
  createTemplate, createVariant, getTemplates, getVariants, replaceVariantFile, setTemplateActive,
  setVariantActive, updateTemplate, updateVariant,
} from './templatesApi'
import type { Template, TemplateForm, TemplateVariant, VariantForm } from './types'

const emptyTemplate: TemplateForm = { nombre: '', descripcion: '' }
const emptyVariant: VariantForm = { nombre: '', archivoPdf: null }

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  return 'No pudimos completar la operación. Intentá nuevamente.'
}

export function TemplateManagementPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Template | null>(null)
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplate)
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [variantForm, setVariantForm] = useState<VariantForm>(emptyVariant)
  const [editingVariant, setEditingVariant] = useState<TemplateVariant | null>(null)
  const [feedback, setFeedback] = useState('')
  const templatesQuery = useQuery({ queryKey: ['templates', search], queryFn: () => getTemplates(search) })
  const variantsQuery = useQuery({
    queryKey: ['template-variants', selected?.id],
    queryFn: () => getVariants(selected!.id),
    enabled: selected !== null,
  })
  const templateMutation = useMutation({
    mutationFn: () => editingTemplate && selected ? updateTemplate(selected.id, templateForm) : createTemplate(templateForm),
    onSuccess: (template) => {
      setFeedback(editingTemplate ? 'Plantilla actualizada correctamente.' : 'Plantilla creada correctamente.')
      setTemplateForm(emptyTemplate)
      setEditingTemplate(false)
      setSelected(template)
      void queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
  const templateActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setTemplateActive(id, active),
    onSuccess: (_, variables) => {
      setFeedback(variables.active ? 'Plantilla activada correctamente.' : 'Plantilla desactivada correctamente.')
      void queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
  const variantMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('No hay una plantilla seleccionada.')
      if (editingVariant) return updateVariant(selected.id, editingVariant.id, variantForm.nombre)
      if (!variantForm.archivoPdf) throw new Error('Seleccioná un archivo PDF.')
      return createVariant(selected.id, variantForm.nombre, variantForm.archivoPdf)
    },
    onSuccess: () => {
      setFeedback(editingVariant ? 'Variante actualizada correctamente.' : 'Variante creada correctamente.')
      setVariantForm(emptyVariant)
      setEditingVariant(null)
      void queryClient.invalidateQueries({ queryKey: ['template-variants', selected?.id] })
    },
  })
  const replaceMutation = useMutation({
    mutationFn: ({ variantId, file }: { variantId: string; file: File }) => replaceVariantFile(selected!.id, variantId, file),
    onSuccess: () => {
      setFeedback('PDF reemplazado correctamente.')
      void queryClient.invalidateQueries({ queryKey: ['template-variants', selected?.id] })
    },
  })
  const variantActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setVariantActive(selected!.id, id, active),
    onSuccess: (_, variables) => {
      setFeedback(variables.active ? 'Variante activada correctamente.' : 'Variante desactivada correctamente.')
      void queryClient.invalidateQueries({ queryKey: ['template-variants', selected?.id] })
    },
  })
  const mutationError = templateMutation.error ?? templateActiveMutation.error ?? variantMutation.error ?? replaceMutation.error ?? variantActiveMutation.error

  function chooseTemplate(template: Template) {
    setSelected(template)
    setEditingTemplate(false)
    setEditingVariant(null)
    setVariantForm(emptyVariant)
  }

  function editTemplate(template: Template) {
    setSelected(template)
    setEditingTemplate(true)
    setTemplateForm({ nombre: template.nombre, descripcion: template.descripcion })
  }

  function toggleTemplate(template: Template) {
    const action = template.active ? 'desactivar' : 'activar'
    if (!window.confirm(`¿Querés ${action} la plantilla ${template.nombre}?`)) return
    templateActiveMutation.mutate({ id: template.id, active: !template.active })
  }

  function editVariant(variant: TemplateVariant) {
    setEditingVariant(variant)
    setVariantForm({ nombre: variant.nombre, archivoPdf: null })
  }

  function toggleVariant(variant: TemplateVariant) {
    const action = variant.active ? 'desactivar' : 'activar'
    if (!window.confirm(`¿Querés ${action} la variante ${variant.nombre}?`)) return
    variantActiveMutation.mutate({ id: variant.id, active: !variant.active })
  }

  function replaceFile(variant: TemplateVariant, file: File | null) {
    if (!file || !window.confirm(`¿Querés reemplazar el PDF de ${variant.nombre}?`)) return
    replaceMutation.mutate({ variantId: variant.id, file })
  }

  return <main className="min-h-screen bg-[#f4f7fb] text-slate-900"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
    <header className="mb-8 border-b border-slate-200 pb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Administración</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Plantillas y variantes</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Gestioná los tipos de documento y sus versiones PDF. Los archivos se validan y almacenan de forma segura.</p></header>
    {feedback && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</p>}
    {mutationError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage(mutationError)}</p>}
    {templatesQuery.isError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage(templatesQuery.error)}</p>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Tipos de documento</h2><p className="text-sm text-slate-500">{templatesQuery.data?.length ?? 0} plantillas</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar plantilla" aria-label="Buscar plantilla" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:w-56" /></div>
      {templatesQuery.isLoading && <p className="py-10 text-center text-sm text-slate-500">Cargando plantillas...</p>}
      {!templatesQuery.isLoading && templatesQuery.data?.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Todavía no hay plantillas.</p>}
      <div className="space-y-3">{templatesQuery.data?.map((template) => <article key={template.id} className={`rounded-xl border p-4 ${selected?.id === template.id ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200'}`}><button type="button" onClick={() => chooseTemplate(template)} className="w-full text-left"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{template.nombre}</h3><p className="mt-1 text-sm text-slate-600">{template.descripcion}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${template.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{template.active ? 'Activa' : 'Inactiva'}</span></div></button><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => editTemplate(template)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-white">Editar</button><button type="button" onClick={() => toggleTemplate(template)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-white">{template.active ? 'Desactivar' : 'Activar'}</button></div></article>)}</div>
    </section><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">{editingTemplate ? 'Editar plantilla' : 'Nueva plantilla'}</h2><form onSubmit={(event) => { event.preventDefault(); templateMutation.mutate() }} className="mt-5 space-y-4"><label className="block text-sm font-medium">Nombre<input required maxLength={200} value={templateForm.nombre} onChange={(event) => setTemplateForm({ ...templateForm, nombre: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label><label className="block text-sm font-medium">Descripción<textarea required maxLength={500} value={templateForm.descripcion} onChange={(event) => setTemplateForm({ ...templateForm, descripcion: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label><div className="flex gap-3">{editingTemplate && <button type="button" onClick={() => { setEditingTemplate(false); setTemplateForm(emptyTemplate) }} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold">Cancelar</button>}<button disabled={templateMutation.isPending} className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{templateMutation.isPending ? 'Guardando...' : editingTemplate ? 'Guardar cambios' : 'Crear plantilla'}</button></div></form>
      {selected && <div className="mt-8 border-t border-slate-200 pt-6"><h2 className="text-lg font-semibold">Variantes de {selected.nombre}</h2><p className="mt-1 text-sm text-slate-500">Cada variante contiene su propio PDF validado.</p><form onSubmit={(event) => { event.preventDefault(); variantMutation.mutate() }} className="mt-4 space-y-3"><label className="block text-sm font-medium">Nombre de la variante<input required maxLength={200} value={variantForm.nombre} onChange={(event) => setVariantForm({ ...variantForm, nombre: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>{!editingVariant && <label className="block text-sm font-medium">Archivo PDF<input required type="file" accept="application/pdf,.pdf" onChange={(event) => setVariantForm({ ...variantForm, archivoPdf: event.target.files?.[0] ?? null })} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" /></label>}<div className="flex gap-3">{editingVariant && <button type="button" onClick={() => { setEditingVariant(null); setVariantForm(emptyVariant) }} className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold">Cancelar</button>}<button disabled={variantMutation.isPending} className="flex-1 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{variantMutation.isPending ? 'Guardando...' : editingVariant ? 'Guardar cambios' : 'Subir variante'}</button></div></form></div>}
    </section></div>{selected && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="mb-5"><h2 className="text-lg font-semibold">Versiones disponibles</h2><p className="text-sm text-slate-500">Los nombres son visibles; las referencias internas de almacenamiento no se muestran.</p></div>{variantsQuery.isLoading && <p className="py-8 text-center text-sm text-slate-500">Cargando variantes...</p>}{variantsQuery.isError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage(variantsQuery.error)}</p>}{!variantsQuery.isLoading && variantsQuery.data?.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">Esta plantilla todavía no tiene variantes.</p>}<div className="grid gap-3 md:grid-cols-2">{variantsQuery.data?.map((variant) => <article key={variant.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{variant.nombre}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${variant.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{variant.active ? 'Activa' : 'Inactiva'}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => editVariant(variant)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Editar nombre</button><button type="button" onClick={() => toggleVariant(variant)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">{variant.active ? 'Desactivar' : 'Activar'}</button><label className="col-span-2 cursor-pointer rounded-lg border border-blue-200 px-3 py-2 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50">Reemplazar PDF<input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => replaceFile(variant, event.target.files?.[0] ?? null)} /></label></div></article>)}</div></section>}
  </div></main>
}
