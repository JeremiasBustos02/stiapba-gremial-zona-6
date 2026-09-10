import type { ButtonHTMLAttributes } from 'react'

export function Button({ className = '', variant = 'default', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' }) {
  const styles = variant === 'outline'
    ? 'border border-slate-300 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50'
    : variant === 'ghost'
      ? 'text-slate-700 hover:bg-slate-100'
      : 'bg-blue-700 text-white hover:bg-blue-800 disabled:bg-blue-300'
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`} {...props} />
}
