import type { HTMLAttributes } from 'react'

export function ActionGroup({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="group" className={`action-group flex w-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm [&>div>button]:h-full [&>div>button]:rounded-none [&>div>button]:focus-visible:outline-none [&>div>button]:focus-visible:ring-2 [&>div>button]:focus-visible:ring-inset [&>div>button]:focus-visible:ring-blue-600 [&>div>div]:h-full [&>div>div>button]:h-full [&>div>div>button]:rounded-none sm:flex-row ${className}`} {...props} />
}

export function ActionGroupItem({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`min-h-12 flex-1 border-b border-slate-200 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${className}`} {...props} />
}
