import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '@/lib/api'
import {
  createUser,
  getUsers,
  resetUserPassword,
  setUserActive,
  updateUser,
} from './usersApi'
import type { CreateUserResponse, EditUserForm, Role, ResetPasswordResponse, User, UserForm } from './types'

const emptyForm: UserForm = { nombre: '', apellido: '', dni: '', role: 'DELEGADO' }

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  return 'No pudimos completar la operación. Intentá nuevamente.'
}

export function UserManagementPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editing, setEditing] = useState<User | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<(CreateUserResponse | ResetPasswordResponse) | null>(null)
  const [feedback, setFeedback] = useState('')

  const usersQuery = useQuery({
    queryKey: ['users', search],
    queryFn: () => getUsers(search),
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (result) => {
      setTemporaryPassword(result)
      setForm(emptyForm)
      setFeedback('Usuario creado correctamente.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditUserForm }) => updateUser(id, data),
    onSuccess: () => {
      setEditing(null)
      setFeedback('Usuario actualizado correctamente.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserActive(id, active),
    onSuccess: (_, variables) => {
      setFeedback(variables.active ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const resetMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: (result) => {
      setTemporaryPassword(result)
      setFeedback('Contraseña restablecida correctamente.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const mutationError = [createMutation, updateMutation, activeMutation, resetMutation]
    .find((mutation) => mutation.isError)?.error

  function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createMutation.mutate(form)
  }

  function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    updateMutation.mutate({
      id: editing.id,
      data: { nombre: editing.nombre, apellido: editing.apellido, role: editing.role },
    })
  }

  function toggleActive(user: User) {
    const action = user.active ? 'desactivar' : 'activar'
    if (user.active && !window.confirm(`¿Querés desactivar a ${user.nombre} ${user.apellido}?`)) return
    if (!user.active && !window.confirm(`¿Querés activar a ${user.nombre} ${user.apellido}?`)) return
    setFeedback(`Procesando: ${action} usuario...`)
    activeMutation.mutate({ id: user.id, active: !user.active })
  }

  function resetPassword(user: User) {
    if (!window.confirm(`¿Querés restablecer la contraseña de ${user.nombre} ${user.apellido}?`)) return
    resetMutation.mutate(user.id)
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Administración</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Usuarios</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">Gestioná el acceso, los roles y los datos de las personas autorizadas.</p>
          </div>
          <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Solo ADMIN</span>
        </header>

        {feedback && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</p>}
        {mutationError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage(mutationError)}</p>}
        {usersQuery.isError && <p role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{errorMessage(usersQuery.error)}</span><button type="button" onClick={() => void usersQuery.refetch()} className="font-semibold underline">Reintentar</button></p>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-labelledby="users-list-title" className="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:order-1">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="users-list-title" className="text-lg font-semibold">Personas registradas</h2>
                <p className="text-sm text-slate-500">{usersQuery.data?.totalElements ?? 0} usuarios</p>
              </div>
              <label className="block sm:w-64">
                <span className="sr-only">Buscar usuario</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o DNI" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>

            {usersQuery.isLoading && <p className="py-10 text-center text-sm text-slate-500">Cargando usuarios...</p>}
            {!usersQuery.isLoading && usersQuery.data?.content.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">Todavía no hay usuarios registrados.</p>}
            <div className="space-y-3">
              {usersQuery.data?.content.map((user) => (
                <article key={user.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{user.nombre} {user.apellido}</h3>
                      <p className="mt-1 text-sm text-slate-600">DNI {user.dni}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{user.role}</span>
                        <span className={`rounded-full px-2.5 py-1 ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{user.active ? 'Activo' : 'Inactivo'}</span>
                        {user.firstLogin && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Primer ingreso</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:w-48">
                      <button type="button" onClick={() => setEditing(user)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Editar</button>
                      <button type="button" onClick={() => resetPassword(user)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Resetear</button>
                      <button type="button" onClick={() => toggleActive(user)} className={`col-span-2 rounded-lg px-3 py-2 text-xs font-semibold ${user.active ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{user.active ? 'Desactivar usuario' : 'Activar usuario'}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="create-user-title" className="order-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:order-2">
            <h2 id="create-user-title" className="text-lg font-semibold">Nuevo usuario</h2>
            <p className="mt-1 text-sm text-slate-500">La contraseña temporal se genera automáticamente.</p>
            <form onSubmit={submitCreate} className="mt-5 space-y-4">
              <UserFields value={form} onChange={setForm} includeDni />
              <button disabled={createMutation.isPending} className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{createMutation.isPending ? 'Creando...' : 'Crear usuario'}</button>
            </form>
          </section>
        </div>
      </div>

      {editing && <EditDialog user={editing} onChange={(value) => setEditing({ ...editing, ...value })} onSubmit={submitEdit} pending={updateMutation.isPending} onClose={() => setEditing(null)} />}
      {temporaryPassword && <TemporaryPasswordDialog result={temporaryPassword} onClose={() => setTemporaryPassword(null)} />}
    </main>
  )
}

function UserFields({ value, onChange, includeDni }: { value: UserForm; onChange: (value: UserForm) => void; includeDni: boolean }) {
  return <>
    <label className="block text-sm font-medium">Nombre<input required maxLength={100} value={value.nombre} onChange={(event) => onChange({ ...value, nombre: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
    <label className="block text-sm font-medium">Apellido<input required maxLength={100} value={value.apellido} onChange={(event) => onChange({ ...value, apellido: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
    {includeDni && <label className="block text-sm font-medium">DNI<input required inputMode="numeric" pattern="[0-9]+" maxLength={20} value={value.dni} onChange={(event) => onChange({ ...value, dni: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>}
    <label className="block text-sm font-medium">Rol<select value={value.role} onChange={(event) => onChange({ ...value, role: event.target.value as Role })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"><option value="DELEGADO">DELEGADO</option><option value="ADMIN">ADMIN</option></select></label>
  </>
}

function EditDialog({ user, onChange, onSubmit, pending, onClose }: { user: User; onChange: (user: User) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; pending: boolean; onClose: () => void }) {
  return <div role="dialog" aria-modal="true" aria-labelledby="edit-user-title" className="fixed inset-0 z-10 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"><div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"><div className="flex items-center justify-between"><h2 id="edit-user-title" className="text-lg font-semibold">Editar usuario</h2><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button></div><p className="mt-1 text-sm text-slate-500">El DNI no puede modificarse.</p><form onSubmit={onSubmit} className="mt-5 space-y-4"><UserFields value={user} onChange={(value) => onChange({ ...user, ...value })} includeDni={false} /><div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold">Cancelar</button><button disabled={pending} className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Guardando...' : 'Guardar cambios'}</button></div></form></div></div>
}

function TemporaryPasswordDialog({ result, onClose }: { result: CreateUserResponse | ResetPasswordResponse; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copyPassword() {
    await navigator.clipboard.writeText(result.temporaryPassword)
    setCopied(true)
  }
  return <div role="dialog" aria-modal="true" aria-labelledby="temporary-password-title" className="fixed inset-0 z-20 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"><div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Operación exitosa</p><h2 id="temporary-password-title" className="mt-2 text-xl font-semibold">Contraseña temporal</h2><p className="mt-2 text-sm text-slate-600">Esta contraseña se muestra una única vez y no podrá consultarse después.</p><code className="mt-5 block rounded-xl bg-slate-100 px-4 py-4 text-center text-lg font-bold tracking-widest text-slate-900">{result.temporaryPassword}</code><div className="mt-4 flex gap-3"><button type="button" onClick={copyPassword} className="flex-1 rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">{copied ? 'Copiada' : 'Copiar contraseña'}</button><button type="button" onClick={onClose} className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800">Cerrar</button></div></div></div>
}
