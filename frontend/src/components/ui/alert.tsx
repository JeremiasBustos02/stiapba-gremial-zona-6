import type { HTMLAttributes } from 'react'

export function Alert({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="alert" className={`typo-body-sm rounded-xl border border-slate-200 bg-white p-4 text-slate-700 ${className}`} {...props} />
}
