import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { AdminConfirmation, AdminEmptyState, AdminHeader, AdminNotice, AdminOverlay } from '@/features/admin/AdminOverlay'
import { ApiError } from '@/lib/api'
import { createUser, getUsers, resetUserPassword, setUserActive, updateUser } from './usersApi'
import type { EditUserForm, Role, User, UserForm } from './types'

const emptyForm: UserForm = { nombre: '', apellido: '', dni: '', role: 'DELEGADO' }

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'No pudimos completar la operación. Intentá nuevamente.'
}

function userName(user: Pick<User, 'nombre' | 'apellido'>) {
  return `${user.nombre} ${user.apellido}`
}

type Confirmation = { user: User; type: 'active' | 'reset' }
type TemporaryPassword = { value: string; name: string }

export function UserManagementPage({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editing, setEditing] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const [actionUser, setActionUser] = useState<User | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<TemporaryPassword | null>(null)
  const [feedback, setFeedback] = useState('')
  const usersQuery = useQuery({ queryKey: ['users', search], queryFn: () => getUsers(search) })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (result) => {
      setTemporaryPassword({ value: result.temporaryPassword, name: `${result.nombre} ${result.apellido}` })
      setCreating(false)
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
      setConfirmation(null)
      setFeedback(variables.active ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  const resetMutation = useMutation({
    mutationFn: (user: User) => resetUserPassword(user.id),
    onSuccess: (result, user) => {
      setConfirmation(null)
      setTemporaryPassword({ value: result.temporaryPassword, name: userName(user) })
      setFeedback('Contraseña restablecida correctamente.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const mutationError = [createMutation, updateMutation, activeMutation, resetMutation].find((mutation) => mutation.isError)?.error
  const editorUser = editing ?? form
  const editorOpen = creating || Boolean(editing)
  const pendingConfirmation = activeMutation.isPending || resetMutation.isPending

  function closeEditor() {
    setCreating(false)
    setEditing(null)
    setForm(emptyForm)
  }

  function openEdit(user: User) {
    setActionUser(null)
    setEditing(user)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { nombre: editing.nombre, apellido: editing.apellido, role: editing.role } })
      return
    }
    createMutation.mutate(form)
  }

  function confirm() {
    if (!confirmation) return
    if (confirmation.type === 'reset') {
      resetMutation.mutate(confirmation.user)
      return
    }
    activeMutation.mutate({ id: confirmation.user.id, active: !confirmation.user.active })
  }

  function openConfirmation(user: User, type: Confirmation['type']) {
    setActionUser(null)
    setConfirmation({ user, type })
  }

  return (
    <section className="max-w-5xl">
      <AdminHeader title="Usuarios" description="Gestioná el acceso, los roles y los datos de las personas autorizadas." newLabel="Nuevo usuario" onCreate={() => { setForm(emptyForm); setCreating(true) }} />
      {feedback && <AdminNotice kind="success">{feedback}</AdminNotice>}
      {mutationError && <AdminNotice kind="error">{errorMessage(mutationError)}</AdminNotice>}
      {usersQuery.isError && <AdminNotice kind="error">{errorMessage(usersQuery.error)} <button type="button" onClick={() => void usersQuery.refetch()} className="font-semibold underline">Reintentar</button></AdminNotice>}

      <section aria-labelledby="users-list-title" className="mt-8">
        <div className="flex flex-col gap-3 border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="users-list-title" className="font-semibold">Personas registradas</h2><p className="mt-1 text-sm text-slate-500">{usersQuery.data?.totalElements ?? 0} usuarios</p></div>
          <label className="sm:w-72"><span className="sr-only">Buscar usuario</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o DNI" className="h-11 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></label>
        </div>
        {usersQuery.isLoading && <p className="py-10 text-center text-sm text-slate-500">Cargando registros...</p>}
        {!usersQuery.isLoading && usersQuery.data?.content.length === 0 && <AdminEmptyState actionLabel="Crear usuario" onAction={() => setCreating(true)}>Todavía no hay usuarios registrados.</AdminEmptyState>}
        <div className="mt-4 divide-y divide-slate-200 border border-slate-200 bg-white">
          {usersQuery.data?.content.map((user) => {
            const canResetPassword = user.active && user.id !== currentUserId
            return <article key={user.id} className="relative flex min-h-24 items-start gap-3 px-4 py-4 transition-colors hover:bg-blue-50/70">
              <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{userName(user)}</h3><p className="mt-1 text-sm text-slate-600">DNI {user.dni}</p><div className="mt-2 flex flex-wrap gap-1.5 typo-caption font-semibold"><Badge>{user.role}</Badge><Badge active={user.active}>{user.active ? 'Activo' : 'Inactivo'}</Badge>{user.firstLogin && <Badge>Debe cambiar contraseña</Badge>}</div></div>
               <div className="relative"><button type="button" onClick={() => setActionUser(actionUser?.id === user.id ? null : user)} className="grid h-11 w-11 place-items-center text-slate-600 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600" aria-label={`Acciones para ${userName(user)}`} aria-expanded={actionUser?.id === user.id}><MoreHorizontal size={20} /></button>{actionUser?.id === user.id && <div className="absolute right-0 z-10 mt-1 w-60 border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgb(15_23_38/0.08)]"><button type="button" onClick={() => openEdit(user)} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50">Editar usuario</button><button type="button" onClick={() => openConfirmation(user, 'active')} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50">{user.active ? 'Desactivar usuario' : 'Activar usuario'}</button>{canResetPassword && <button type="button" onClick={() => openConfirmation(user, 'reset')} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50">Restablecer contraseña</button>}</div>}</div>
            </article>
          })}
        </div>
      </section>

      {editorOpen && <AdminOverlay title={editing ? 'Editar usuario' : 'Nuevo usuario'} onClose={closeEditor}><form onSubmit={submit} className="mt-6 space-y-4"><UserFields value={editorUser} onChange={(value) => editing ? setEditing({ ...editing, ...value }) : setForm(value)} includeDni={!editing} /><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeEditor} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button><button disabled={createMutation.isPending || updateMutation.isPending} className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}</button></div></form></AdminOverlay>}
      {confirmation && <AdminConfirmation title={confirmation.type === 'reset' ? 'Restablecer contraseña' : confirmation.user.active ? 'Desactivar usuario' : 'Activar usuario'} message={confirmation.type === 'reset' ? 'Se generará una contraseña temporal y se cerrarán las sesiones actuales de este usuario. Deberá cambiarla la próxima vez que ingrese.' : confirmation.user.active ? 'El usuario no podrá iniciar sesión mientras esté desactivado.' : 'El usuario podrá volver a iniciar sesión.'} actionLabel={confirmation.type === 'reset' ? 'Restablecer' : confirmation.user.active ? 'Desactivar' : 'Activar'} pendingLabel={confirmation.type === 'reset' ? 'Restableciendo...' : undefined} pending={pendingConfirmation} onCancel={() => setConfirmation(null)} onConfirm={confirm} destructive={confirmation.type === 'active' && confirmation.user.active} />}
      {temporaryPassword && <TemporaryPasswordDialog password={temporaryPassword} onClose={() => setTemporaryPassword(null)} />}
    </section>
  )
}

function Badge({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return <span className={`rounded-full px-2.5 py-1 ${active === undefined ? 'bg-slate-100 text-slate-700' : active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{children}</span>
}

function UserFields({ value, onChange, includeDni }: { value: UserForm; onChange: (value: UserForm) => void; includeDni: boolean }) {
  return <><label className="block text-sm font-semibold">Nombre<input required maxLength={100} value={value.nombre} onChange={(event) => onChange({ ...value, nombre: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></label><label className="block text-sm font-semibold">Apellido<input required maxLength={100} value={value.apellido} onChange={(event) => onChange({ ...value, apellido: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></label>{includeDni && <label className="block text-sm font-semibold">DNI<input required inputMode="numeric" pattern="[0-9]+" maxLength={20} value={value.dni} onChange={(event) => onChange({ ...value, dni: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></label>}<label className="block text-sm font-semibold">Rol<select value={value.role} onChange={(event) => onChange({ ...value, role: event.target.value as Role })} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"><option value="DELEGADO">DELEGADO</option><option value="ADMIN">ADMIN</option></select></label></>
}

function TemporaryPasswordDialog({ password, onClose }: { password: TemporaryPassword; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  async function copy() {
    try {
      await navigator.clipboard.writeText(password.value)
      setCopied(true)
      setCopyError('')
    } catch {
      setCopyError('No pudimos copiar la contraseña. Copiala manualmente antes de cerrar.')
    }
  }

  return <AdminOverlay title="Contraseña temporal generada" description="Esta contraseña se muestra una única vez y no podrá consultarse después." onClose={onClose}><p className="mt-5 text-sm font-semibold text-slate-700">{password.name}</p><code className="mt-3 block rounded-xl bg-slate-100 px-4 py-4 text-center text-lg font-bold tracking-widest text-slate-900">{password.value}</code>{copyError && <p role="alert" className="mt-3 text-sm text-rose-700">{copyError}</p>}<p className="mt-4 text-sm text-slate-600">El usuario deberá cambiarla la próxima vez que ingrese.</p><div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => void copy()} className="min-h-11 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">{copied ? 'Contraseña copiada' : 'Copiar contraseña'}</button><button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Listo</button></div></AdminOverlay>
}
