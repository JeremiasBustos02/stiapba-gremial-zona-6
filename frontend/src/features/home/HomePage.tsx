import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, ArrowUpRight, FilePlus2, History, Search, ShieldCheck, UserRound } from 'lucide-react'
import type { AuthUser } from '@/features/auth/authApi'
import { getDashboard } from '@/features/documents/documentsApi'
import { ApiError } from '@/lib/api'
import type { Screen } from '@/navigation'
import { Button } from '@/components/ui/button'

export function HomePage({ user, onNavigate }: { user: AuthUser; onNavigate: (screen: Screen) => void }) {
  const dashboardQuery = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
  const scope = user.role === 'ADMIN' ? 'del sistema' : 'personal'
  const errorText = dashboardQuery.error instanceof ApiError && dashboardQuery.error.code ? dashboardQuery.error.message : 'No pudimos cargar el resumen. Intentá nuevamente.'

  return <section className="max-w-[82rem]">
    <header className="motion-reveal border-b border-slate-200 pb-8 sm:pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
      <div><p className="typo-eyebrow text-blue-700">STIA PBA · Zona 6</p><h1 className="typo-display-xl mt-2 max-w-3xl uppercase">Hola, {user.nombre}</h1><p className="typo-body-lg mt-4 max-w-2xl text-slate-600">Gestioná la documentación gremial con la información que ya tenés disponible.</p><button type="button" onClick={() => onNavigate('new-document')} className="group mt-7 flex min-h-14 w-full items-center justify-between gap-4 bg-blue-800 px-5 text-left text-white transition-[background-color,transform] duration-200 hover:bg-blue-900 active:translate-y-px focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:mt-8 sm:w-auto sm:min-w-64 sm:px-6"><span className="flex items-center gap-3"><FilePlus2 size={21} aria-hidden="true" /><span className="typo-control">Crear documento</span></span><ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={21} aria-hidden="true" /></button></div>
      <div className="mt-8 hidden border-l border-slate-200 pl-6 lg:block"><p className="typo-eyebrow text-slate-500">Espacio de trabajo</p><p className="typo-body-sm mt-3 text-slate-600">Resumen {scope}. Accedé a las tareas principales desde un solo lugar.</p><span aria-hidden="true" className="typo-decorative mt-5 block text-[7rem] text-blue-100">06</span></div>
    </header>

    {dashboardQuery.isPending ? <DashboardLoading /> : dashboardQuery.isError ? <DashboardError text={errorText} onRetry={() => dashboardQuery.refetch()} /> : <><Summary documentsThisMonth={dashboardQuery.data.documentsThisMonth} totalDocuments={dashboardQuery.data.totalDocuments} role={user.role} /><QuickWork role={user.role} onNavigate={onNavigate} /></>}
  </section>
}

function Summary({ documentsThisMonth, totalDocuments, role }: { documentsThisMonth: number; totalDocuments: number; role: AuthUser['role'] }) {
  const scope = role === 'ADMIN' ? 'Resumen del sistema' : 'Tu resumen'
  if (totalDocuments === 0) return <section className="motion-reveal mt-8 border-y border-slate-200 py-10 sm:mt-10 sm:py-14" aria-labelledby="summary-title"><p className="typo-eyebrow text-blue-700">{scope}</p><h2 id="summary-title" className="typo-display-lg mt-3 uppercase">Todavía no hay actividad</h2><p className="typo-body-sm mt-3 max-w-md text-slate-600">Cuando generes el primer documento, el resumen aparecerá acá.</p></section>
  return <section className="motion-reveal mt-8 border-y border-blue-200 bg-blue-50/70 px-5 py-7 sm:mt-10 sm:px-8 sm:py-9" aria-labelledby="summary-title"><p className="typo-eyebrow text-blue-800">{scope}</p><h2 id="summary-title" className="sr-only">{scope}</h2><dl className="mt-6 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,1fr)] lg:gap-10"><div><dt className="typo-meta text-slate-600">Documentos este mes</dt><dd className="typo-display-xl mt-1 tabular-nums text-blue-950">{documentsThisMonth}</dd><p className="typo-body-sm mt-1 text-slate-600">{documentsThisMonth === 1 ? 'documento generado' : 'documentos generados'}</p></div><div className="mt-7 border-t border-blue-200 pt-5 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><dt className="typo-meta text-slate-600">Total de documentos</dt><dd className="typo-display-lg mt-1 tabular-nums text-blue-950">{totalDocuments}</dd><p className="typo-body-sm mt-1 text-slate-600">disponibles en el historial</p></div></dl></section>
}

function QuickWork({ role, onNavigate }: { role: AuthUser['role']; onNavigate: (screen: Screen) => void }) {
  const openSearch = () => window.dispatchEvent(new Event('open-global-search'))
  return <section className="motion-reveal mt-10 border-t border-slate-200 pt-6 sm:mt-12" aria-labelledby="quick-work-title"><p className="typo-eyebrow text-slate-500">Acciones</p><h2 id="quick-work-title" className="typo-heading-2 mt-2">Trabajo rápido</h2><div className="mt-5 divide-y divide-slate-200 border-y border-slate-200"><WorkRow icon={Search} title="Buscar documentos" description="Encontrá por número, empresa o delegado." action="Buscar" onClick={openSearch} /><WorkRow icon={History} title="Historial" description="Consultá, descargá o reutilizá documentos." action="Ver" onClick={() => onNavigate('history')} />{role === 'ADMIN' && <WorkRow icon={ShieldCheck} title="Administración" description="Gestioná usuarios, catálogos y plantillas." action="Abrir" onClick={() => onNavigate('admin')} />}<WorkRow icon={UserRound} title="Mi perfil" description="Consultá tu información y opciones de sesión." action="Ver" onClick={() => onNavigate('profile')} /></div></section>
}

function WorkRow({ icon: Icon, title, description, action, onClick }: { icon: typeof Search; title: string; description: string; action: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group flex min-h-16 w-full items-center gap-4 py-4 text-left hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 sm:px-3"><Icon className="shrink-0 text-blue-700" size={19} aria-hidden="true" /><span className="min-w-0 flex-1"><strong className="block text-slate-900">{title}</strong><span className="typo-body-sm mt-0.5 block text-slate-600">{description}</span></span><span className="typo-control inline-flex min-h-11 shrink-0 items-center gap-1 text-blue-800 group-hover:text-blue-950">{action} <ArrowRight size={17} aria-hidden="true" /></span></button>
}

function DashboardLoading() { return <div className="mt-8 animate-pulse space-y-8" aria-label="Cargando resumen"><div className="h-48 border-y border-slate-200 bg-slate-100" /><div className="h-56 border-y border-slate-200 bg-slate-100" /></div> }
function DashboardError({ text, onRetry }: { text: string; onRetry: () => void }) { return <div role="alert" className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900"><span className="flex items-center gap-3"><AlertCircle size={19} aria-hidden="true" />{text}</span><Button variant="outline" onClick={onRetry}>Reintentar resumen</Button></div> }
