import { LoaderCircle, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api'
import { sendDocumentEmail } from './documentsApi'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const defaultMessage = 'Adjuntamos el Permiso Gremial correspondiente.'

export function DocumentEmailDialog({ documentId, publicNumber, open, onOpenChange, onSuccess }: {
  documentId: string | null
  publicNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (message: string) => void
}) {
  const [recipients, setRecipients] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState(defaultMessage)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setRecipients('')
    setSubject(publicNumber ? `Permiso Gremial ${publicNumber}` : 'Permiso Gremial')
    setMessage(defaultMessage)
    setError('')
  }, [open, publicNumber])

  const close = () => { if (!sending) onOpenChange(false) }
  const send = async () => {
    if (!documentId) return
    const parsedRecipients = [...new Set(recipients.split(',').map((item) => item.trim()).filter(Boolean))]
    if (!parsedRecipients.length || parsedRecipients.some((item) => !emailPattern.test(item))) {
      setError('Ingresá uno o más correos electrónicos válidos, separados por comas.')
      return
    }
    if (!subject.trim()) { setError('Ingresá un asunto.'); return }
    if (subject.length > 200) { setError('El asunto no puede superar los 200 caracteres.'); return }
    if (message.length > 5000) { setError('El mensaje no puede superar los 5000 caracteres.'); return }
    setSending(true)
    setError('')
    try {
      const result = await sendDocumentEmail(documentId, { recipients: parsedRecipients, subject: subject.trim(), message })
      onSuccess?.(result.message)
      onOpenChange(false)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No pudimos enviar el correo. Intentá nuevamente.')
    } finally { setSending(false) }
  }

  return <Dialog open={open} onOpenChange={(next) => next ? onOpenChange(true) : close()}>{documentId && <DialogContent>
    <DialogHeader><DialogTitle>Enviar documento</DialogTitle><DialogDescription>{publicNumber} · Permiso gremial</DialogDescription></DialogHeader>
    <div className="mt-6 space-y-4">
      <label className="block text-sm font-semibold text-slate-900">Destinatarios
        <input value={recipients} onChange={(event) => setRecipients(event.target.value)} type="text" autoComplete="email" placeholder="persona@ejemplo.com, otra@ejemplo.com" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
      </label>
      <label className="block text-sm font-semibold text-slate-900">Asunto
        <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} type="text" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
      </label>
      <label className="block text-sm font-semibold text-slate-900">Mensaje
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={5} className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
      </label>
    </div>
    {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-800">{error}</p>}
    <div className="mt-7 flex justify-end gap-2"><DialogClose asChild><Button variant="outline" disabled={sending} onClick={close}>Cancelar</Button></DialogClose><Button onClick={send} disabled={sending}>{sending ? <LoaderCircle className="animate-spin" size={17} /> : <Mail size={17} />} Enviar correo</Button></div>
  </DialogContent>}</Dialog>
}
