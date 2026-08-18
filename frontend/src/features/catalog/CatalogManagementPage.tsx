import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '@/lib/api'
import type { Agreement, AgreementForm, Company, CompanyForm } from './types'

type Props<T extends Company | Agreement, F extends CompanyForm | AgreementForm> = {
  kind: 'companies' | 'agreements'
  title: string
  description: string
  emptyForm: F
  getItems: (search: string) => Promise<T[]>
  createItem: (form: F) => Promise<T>
  updateItem: (id: string, form: F) => Promise<T>
  setActive: (id: string, active: boolean) => Promise<void>
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  return 'No pudimos completar la operación. Intentá nuevamente.'
}

export function CatalogManagementPage<T extends Company | Agreement, F extends CompanyForm | AgreementForm>({
  kind, title, description, emptyForm, getItems, createItem, updateItem, setActive,
}: Props<T, F>) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<F>(emptyForm)
  const [editing, setEditing] = useState<T | null>(null)
  const [feedback, setFeedback] = useState('')
  const queryKey = [kind, search]
  const itemsQuery = useQuery({ queryKey, queryFn: () => getItems(search) })
  const saveMutation = useMutation({
    mutationFn: editing ? (value: F) => updateItem(editing.id, value) : createItem,
    onSuccess: () => {
      setForm(emptyForm)
      setEditing(null)
      setFeedback(`${title.slice(0, -1)} guardado correctamente.`)
      void queryClient.invalidateQueries({ queryKey: [kind] })
    },
  })
  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setActive(id, active),
    onSuccess: (_, variables) => {
      setFeedback(variables.active ? `${title.slice(0, -1)} activado correctamente.` : `${title.slice(0, -1)} desactivado correctamente.`)
      void queryClient.invalidateQueries({ queryKey: [kind] })
    },
  })
  const mutationError = saveMutation.error ?? activeMutation.error

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveMutation.mutate(form)
  }

  function edit(item: T) {
    setEditing(item)
    setForm(kind === 'companies'
      ? { nombre: (item as Company).nombre } as F
      : { codigo: (item as Agreement).codigo ?? '', descripcion: (item as Agreement).descripcion } as F)
  }

  function toggleActive(item: T) {
    const label = kind === 'companies' ? (item as Company).nombre : (item as Agreement).descripcion
    const action = item.active ? 'desactivar' : 'activar'
    if (!window.confirm(`¿Querés ${action} ${label}?`)) return
    activeMutation.mutate({ id: item.id, active: !item.active })
  }

  return <main className="min-h-screen bg-[#f4f7fb] text-slate-900"><div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
    <header className="mb-8 border-b border-slate-200 pb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Administración</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 max-w-xl text-sm text-slate-600">{description}</p></header>
    {feedback && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</p>}
    {mutationError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage(mutationError)}</p>}
    {itemsQuery.isError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage(itemsQuery.error)}</p>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><section className="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:order-1">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Registros</h2><p className="text-sm text-slate-500">{itemsQuery.data?.length ?? 0} resultados</p></div><label className="block sm:w-64"><span className="sr-only">Buscar</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label></div>
      {itemsQuery.isLoading && <p className="py-10 text-center text-sm text-slate-500">Cargando registros...</p>}
      {!itemsQuery.isLoading && itemsQuery.data?.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Todavía no hay registros.</p>}
      <div className="space-y-3">{itemsQuery.data?.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-semibold">{kind === 'companies' ? (item as Company).nombre : (item as Agreement).descripcion}</h3>{kind === 'agreements' && <p className="mt-1 text-sm text-slate-600">Código: {(item as Agreement).codigo ?? 'Sin código'}</p>}<span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></div><div className="grid grid-cols-2 gap-2 sm:w-48"><button type="button" onClick={() => edit(item)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Editar</button><button type="button" onClick={() => toggleActive(item)} className={`col-span-2 rounded-lg px-3 py-2 text-xs font-semibold ${item.active ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{item.active ? 'Desactivar' : 'Activar'}</button></div></div></article>)}</div>
    </section><section className="order-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:order-2"><h2 className="text-lg font-semibold">{editing ? `Editar ${title.slice(0, -1).toLowerCase()}` : `Nueva ${title.slice(0, -1).toLowerCase()}`}</h2><form onSubmit={submit} className="mt-5 space-y-4">{kind === 'companies' ? <label className="block text-sm font-medium">Nombre<input required maxLength={200} value={(form as CompanyForm).nombre} onChange={(event) => setForm({ nombre: event.target.value } as F)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label> : <><label className="block text-sm font-medium">Código <span className="font-normal text-slate-500">(opcional)</span><input maxLength={50} value={(form as AgreementForm).codigo} onChange={(event) => setForm({ ...(form as AgreementForm), codigo: event.target.value } as F)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label><label className="block text-sm font-medium">Descripción<textarea required maxLength={500} value={(form as AgreementForm).descripcion} onChange={(event) => setForm({ ...(form as AgreementForm), descripcion: event.target.value } as F)} className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label></>}<div className="flex gap-3">{editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm) }} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold">Cancelar</button>}<button disabled={saveMutation.isPending} className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{saveMutation.isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear'}</button></div></form></section></div>
  </div></main>
}
