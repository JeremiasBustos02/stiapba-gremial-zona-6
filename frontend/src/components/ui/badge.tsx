import type { HTMLAttributes } from 'react'

export function Badge({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 ${className}`} {...props} />
}
