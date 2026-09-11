import { forwardRef, type LabelHTMLAttributes } from 'react'

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(function Label({ className = '', ...props }, ref) {
  return <label ref={ref} className={`typo-label text-slate-900 ${className}`} {...props} />
})
