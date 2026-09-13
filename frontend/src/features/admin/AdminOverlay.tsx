import { Plus, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function AdminOverlay({ title, description, children, onClose }: { title: string; description?: string; children: ReactNode; onClose: () => void }) {
  const content = useRef<HTMLElement>(null)
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusable = () => [...(content.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [])]
    const first = focusable()[0]
    first?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const index = items.indexOf(document.activeElement as HTMLElement)
      if (event.shiftKey && (index <= 0 || document.activeElement === content.current)) { event.preventDefault(); items.at(-1)?.focus() }
      if (!event.shiftKey && index === items.length - 1) { event.preventDefault(); items[0].focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previouslyFocused?.focus() }
  }, [onClose])
  return <div role="dialog" aria-modal="true" aria-labelledby="admin-overlay-title" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4"><section ref={content} className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-t-xl border border-slate-200 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-h-[85dvh] sm:rounded-lg sm:p-6"><div className="mx-auto mb-4 h-1 w-10 bg-slate-300 sm:hidden" /><div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><p className="typo-eyebrow text-blue-700">Administración</p><h2 id="admin-overlay-title" className="typo-heading-3 mt-1">{title}</h2>{description && <p className="typo-body-sm mt-2 text-slate-600">{description}</p>}</div><button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600" aria-label="Cerrar"><X size={20} /></button></div>{children}</section></div>
}

export function AdminConfirmation({ title, message, actionLabel, pending, pendingLabel = 'Procesando...', onCancel, onConfirm, destructive = false, cancelLabel = 'Cancelar' }: { title: string; message: string; actionLabel: string; pending: boolean; pendingLabel?: string; onCancel: () => void; onConfirm: () => void; destructive?: boolean; cancelLabel?: string }) { return <AdminOverlay title={title} description={message} onClose={onCancel}><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} disabled={pending} className="typo-control min-h-11 border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60">{cancelLabel}</button><button type="button" onClick={onConfirm} disabled={pending} className={`typo-control min-h-11 px-4 py-2 text-white disabled:opacity-60 ${destructive ? 'bg-rose-700 hover:bg-rose-800' : 'bg-blue-700 hover:bg-blue-800'}`}>{pending ? pendingLabel : actionLabel}</button></div></AdminOverlay> }
export function AdminHeader({ title, description, newLabel, onCreate }: { title: string; description?: string; newLabel: string; onCreate: () => void }) { return <header className="flex flex-col gap-4 border-l-4 border-blue-700 pl-4 sm:flex-row sm:items-end sm:justify-between sm:pl-5"><div><p className="typo-eyebrow text-blue-700">Administración</p><h1 className="typo-display-xl mt-1 uppercase">{title}</h1>{description && <p className="typo-body-sm mt-3 max-w-xl text-slate-600">{description}</p>}</div><button type="button" onClick={onCreate} className="typo-control flex min-h-11 items-center justify-center gap-2 bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><Plus size={18} />{newLabel}</button></header> }
export function AdminNotice({ kind, children }: { kind: 'success' | 'error'; children: ReactNode }) { return <p role={kind === 'error' ? 'alert' : 'status'} className={`typo-body-sm mt-5 border px-4 py-3 ${kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{children}</p> }
export function AdminEmptyState({ children, actionLabel, onAction }: { children: ReactNode; actionLabel: string; onAction: () => void }) { return <div className="border-y border-slate-200 py-10 text-center"><p className="typo-body-sm text-slate-600">{children}</p><button type="button" onClick={onAction} className="typo-control mt-4 min-h-11 border border-blue-200 bg-white px-4 py-2 text-blue-700 hover:border-blue-300 hover:bg-blue-50">{actionLabel}</button></div> }
