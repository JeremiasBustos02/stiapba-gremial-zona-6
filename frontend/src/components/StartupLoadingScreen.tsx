import { FileText, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

const MAX_ESTIMATED_PROGRESS = 93
const PROGRESS_TIME_CONSTANT = 22_000

export function startupMessage(elapsedMs: number) {
  if (elapsedMs < 3_000) return 'Verificando sesión...'
  if (elapsedMs < 10_000) return 'Conectando con el servidor...'
  return 'Iniciando el servicio...'
}

export function startupProgress(elapsedMs: number, completed = false) {
  if (completed) return 100
  const progress = 8 + (MAX_ESTIMATED_PROGRESS - 8) * (1 - Math.exp(-elapsedMs / PROGRESS_TIME_CONSTANT))
  return Math.min(MAX_ESTIMATED_PROGRESS, Math.round(progress))
}

export function shouldShowStartupLoading({ isPending, isSuccess, startupComplete }: { isPending: boolean; isSuccess: boolean; startupComplete: boolean }) {
  return isPending || (isSuccess && !startupComplete)
}

type StartupLoadingScreenProps = {
  completed?: boolean
  onComplete?: () => void
}

export function StartupLoadingScreen({ completed = false, onComplete }: StartupLoadingScreenProps) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (completed) {
      const timeout = window.setTimeout(() => onComplete?.(), 220)
      return () => window.clearTimeout(timeout)
    }

    const startedAt = Date.now()
    const interval = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 250)
    return () => window.clearInterval(interval)
  }, [completed, onComplete])

  const progress = startupProgress(elapsedMs, completed)
  const longWait = !completed && elapsedMs >= 10_000

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10" aria-labelledby="startup-title">
      <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-sm" aria-hidden="true"><FileText size={32} /></span>
      <p className="mt-5 text-sm font-semibold uppercase tracking-[.16em] text-blue-700">STIA PBA Zona 6</p>
      <h1 id="startup-title" className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{completed ? 'Listo' : 'Preparando la aplicación'}</h1>
      <div className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold text-slate-600" role="status" aria-live="polite">
        {!completed && <LoaderCircle className="animate-spin text-blue-700" size={19} aria-hidden="true" />}
        <span>{completed ? 'Continuando...' : startupMessage(elapsedMs)}</span>
      </div>
      {longWait && <p className="mt-3 text-sm leading-relaxed text-slate-500">Esto puede tardar unos instantes después de un período de inactividad.</p>}
      <div className="mt-7" role="progressbar" aria-label="Progreso estimado de inicio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-700 transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm font-semibold tabular-nums text-slate-600">{progress}%</p>
      </div>
    </section>
  </main>
}
