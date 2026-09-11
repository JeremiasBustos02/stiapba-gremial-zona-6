import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentProps } from 'react'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export function DialogContent({ className = '', ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="bottom-sheet-overlay fixed inset-0 z-40 bg-slate-950/40" /><DialogPrimitive.Content className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none ${className}`} {...props} /></DialogPrimitive.Portal>
}
export const DialogHeader = ({ className = '', ...props }: ComponentProps<'div'>) => <div className={`space-y-1.5 ${className}`} {...props} />
export const DialogTitle = ({ className = '', ...props }: ComponentProps<typeof DialogPrimitive.Title>) => <DialogPrimitive.Title className={`typo-heading-3 text-slate-950 ${className}`} {...props} />
export const DialogDescription = ({ className = '', ...props }: ComponentProps<typeof DialogPrimitive.Description>) => <DialogPrimitive.Description className={`typo-body-sm text-slate-600 ${className}`} {...props} />
