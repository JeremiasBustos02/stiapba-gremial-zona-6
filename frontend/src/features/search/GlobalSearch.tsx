import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Building2, FileText, History, Landmark, LoaderCircle, Search, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { searchGlobal, type SearchItem } from './searchApi'
import type { DocumentHistoryRecord } from '@/features/documents/documentsApi'
import type { Screen } from '@/navigation'

type Props = {
  role: 'ADMIN' | 'DELEGADO'
  onNavigate: (screen: Screen) => void
  onOpenDocument: (document: DocumentHistoryRecord) => void
  onPrefill: (kind: 'company' | 'delegate' | 'agreement', id: string) => void
}

export function GlobalSearch({ role, onNavigate, onOpenDocument, onPrefill }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const searchQuery = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => searchGlobal(debouncedQuery),
    enabled: open && debouncedQuery.length >= 2,
  })

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 180)
    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const close = () => {
    setOpen(false)
    setQuery('')
    setDebouncedQuery('')
  }
  const run = (action: () => void) => {
    close()
    action()
  }
  const hasResults = searchQuery.data && [searchQuery.data.documents.length, searchQuery.data.companies.length, searchQuery.data.delegates.length, searchQuery.data.agreements.length].some(Boolean)

  return <>
    <button type="button" onClick={() => setOpen(true)} className="typo-control hidden min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-left text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 sm:flex sm:max-w-xs" aria-label="Buscar en el sistema">
      <span className="flex min-w-0 items-center gap-2"><Search size={17} aria-hidden="true" /><span className="truncate">Buscar en el sistema</span></span><kbd className="hidden rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 lg:inline">Ctrl K</kbd>
    </button>
    <button type="button" onClick={() => setOpen(true)} className="grid min-h-11 min-w-11 place-items-center rounded-md text-slate-600 hover:bg-slate-100 sm:hidden" aria-label="Buscar en el sistema"><Search size={19} aria-hidden="true" /></button>
    <Dialog open={open} onOpenChange={(next) => next ? setOpen(true) : close()}>
      <DialogContent className="top-[10%] max-h-[80dvh] -translate-y-0 overflow-y-auto p-0 sm:top-[15%] sm:max-w-2xl">
        <DialogHeader className="border-b border-slate-200 px-5 py-4"><DialogTitle>Buscar en el sistema</DialogTitle><DialogDescription>Documentos, empresas, delegados y convenios.</DialogDescription></DialogHeader>
        <div className="relative border-b border-slate-200"><Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} aria-hidden="true" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Escribí al menos 2 caracteres" className="h-14 w-full bg-white px-14 pr-12 text-base outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600" aria-label="Buscar" />{query && <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 grid min-h-10 min-w-10 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Limpiar búsqueda"><X size={18} /></button>}</div>
        <div className="p-3">
          <div className="grid gap-1 sm:grid-cols-2"><QuickAction icon={FileText} label="Crear documento" onClick={() => run(() => onNavigate('new-document'))} /><QuickAction icon={History} label="Ver historial" onClick={() => run(() => onNavigate('history'))} />{role === 'ADMIN' && <QuickAction icon={Landmark} label="Administración" onClick={() => run(() => onNavigate('admin'))} />}</div>
          {debouncedQuery.length < 2 ? <p className="px-3 py-8 text-center text-sm text-slate-500">Buscá por número, nombre, DNI o convenio.</p> : searchQuery.isPending ? <p role="status" className="flex items-center justify-center gap-2 px-3 py-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} />Buscando...</p> : searchQuery.isError ? <p role="alert" className="px-3 py-8 text-center text-sm text-rose-700">No pudimos realizar la búsqueda. Intentá nuevamente.</p> : !hasResults ? <p className="px-3 py-8 text-center text-sm text-slate-500">No encontramos resultados para “{debouncedQuery}”.</p> : <div className="mt-4 space-y-4"><ResultGroup title="Documentos" icon={FileText}>{searchQuery.data.documents.map((item) => <button key={item.id} type="button" onClick={() => run(() => onOpenDocument(item))} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><span className="min-w-0"><strong className="block truncate">{item.publicNumber}</strong><span className="block truncate text-xs text-slate-500">{item.companyName} · {item.delegateName}</span></span><ArrowRight size={17} aria-hidden="true" /></button>)}</ResultGroup><ResultGroup title="Empresas" icon={Building2}>{searchQuery.data.companies.map((item) => <CatalogResult key={item.id} item={item} onClick={() => run(() => onPrefill('company', item.id))} />)}</ResultGroup><ResultGroup title="Delegados" icon={UserRound}>{searchQuery.data.delegates.map((item) => <CatalogResult key={item.id} item={item} onClick={() => run(() => onPrefill('delegate', item.id))} />)}</ResultGroup><ResultGroup title="Convenios" icon={Landmark}>{searchQuery.data.agreements.map((item) => <CatalogResult key={item.id} item={item} onClick={() => run(() => onPrefill('agreement', item.id))} />)}</ResultGroup></div>}
        </div>
      </DialogContent>
    </Dialog>
  </>
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Search; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex min-h-12 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-left text-sm font-semibold hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><Icon size={18} className="text-blue-700" aria-hidden="true" /><span>{label}</span><ArrowRight className="ml-auto" size={16} aria-hidden="true" /></button> }
function ResultGroup({ title, icon: Icon, children }: { title: string; icon: typeof Search; children: React.ReactNode }) { if (!children) return null; return <section><h3 className="mb-1 flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><Icon size={15} aria-hidden="true" />{title}</h3>{children}</section> }
function CatalogResult({ item, onClick }: { item: SearchItem; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><span className="min-w-0"><strong className="block truncate">{item.label}</strong><span className="block truncate text-xs text-slate-500">{item.secondaryLabel}</span></span><ArrowRight size={17} aria-hidden="true" /></button> }
