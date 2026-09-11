import type { HTMLAttributes } from 'react'

export function Badge({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`typo-caption inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-800 ${className}`} {...props} />
}
