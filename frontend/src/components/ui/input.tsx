import { forwardRef, type InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`typo-body-sm flex h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:border-rose-600 aria-[invalid=true]:focus:ring-rose-100 ${className}`} {...props} />
})
