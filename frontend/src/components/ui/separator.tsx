import type { HTMLAttributes } from 'react'

export function Separator({ className = '', orientation = 'horizontal', ...props }: HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }) {
  return <div role="separator" aria-orientation={orientation} className={`${orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full'} shrink-0 bg-slate-200 ${className}`} {...props} />
}
