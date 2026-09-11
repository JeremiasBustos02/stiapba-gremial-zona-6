import { forwardRef, type ButtonHTMLAttributes } from 'react'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' }>(function Button({ className = '', variant = 'default', ...props }, ref) {
  const styles = variant === 'outline'
    ? 'border border-slate-300 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50'
    : variant === 'ghost'
      ? 'text-slate-700 hover:bg-slate-100'
      : 'bg-[var(--color-action)] text-white hover:bg-blue-700 disabled:bg-blue-300'
  return <button ref={ref} className={`typo-control inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 transition-[background-color,border-color,color,transform] duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`} {...props} />
})
