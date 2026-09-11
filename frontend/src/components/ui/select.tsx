import { forwardRef, type SelectHTMLAttributes } from 'react'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = '', ...props }, ref) {
  return <select ref={ref} className={`typo-body-sm h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:border-rose-600 aria-[invalid=true]:focus:ring-rose-100 ${className}`} {...props} />
})
