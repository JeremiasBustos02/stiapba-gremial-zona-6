import { LoaderCircle, Mail } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api'
import { sendDocumentEmail } from './documentsApi'

export function DocumentEmailDialog({ documentId, publicNumber, open, onOpenChange }: { documentId: string | null; publicNumber: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [recipient, setRecipient] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sending, setSending] = useState(false)
  const close = () => { setRecipient(''); setError(''); setSuccess(''); onOpenChange(false) }
  const send = async () => {
    if (!documentId) return
    if (!/^\S+@\S+\.\S+$/.test(recipient.trim())) { setError('Ingresá un correo electrónico válido.'); return }
    setSending(true); setError('')
    try { setSuccess((await sendDocumentEmail(documentId, recipient.trim())).message) }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'No pudimos enviar el correo. Intentá nuevamente.') }
    finally { setSending(false) }
  }
  return <Dialog open={open} onOpenChange={(next) => next || close()}>{documentId && <DialogContent><DialogHeader><DialogTitle>Enviar documento</DialogTitle><DialogDescription>{publicNumber} · Permiso gremial</DialogDescription></DialogHeader>{success ? <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</p> : <><label className="mt-6 block text-sm font-semibold text-slate-900">Correo electrónico<input value={recipient} onChange={(event) => setRecipient(event.target.value)} type="email" autoComplete="email" placeholder="persona@ejemplo.com" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></label>{error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-800">{error}</p>}</>}<div className="mt-7 flex justify-end gap-2"><DialogClose asChild><Button variant="outline" disabled={sending} onClick={close}>{success ? 'Cerrar' : 'Cancelar'}</Button></DialogClose>{!success && <Button onClick={send} disabled={sending}>{sending ? <LoaderCircle className="animate-spin" size={17} /> : <Mail size={17} />} Enviar</Button>}</div></DialogContent>}</Dialog>
}
