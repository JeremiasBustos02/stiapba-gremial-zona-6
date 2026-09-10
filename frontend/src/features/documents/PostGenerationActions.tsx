import { Download, Mail, Pencil, Printer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { GeneratedDocument } from './documentsApi'
import { DocumentEmailDialog } from './DocumentEmailDialog'
import { downloadDocument, printDocument } from './documentActions'

export function PostGenerationActions({ document, onEdit, onFinish }: { document: GeneratedDocument; onEdit: () => void; onFinish: () => void }) {
  const [open, setOpen] = useState(true)
  const [emailOpen, setEmailOpen] = useState(false)
  const printCleanup = useRef<(() => void) | null>(null)
  useEffect(() => () => printCleanup.current?.(), [])
  const print = () => { printCleanup.current?.(); printCleanup.current = printDocument(document.blob) }
  return <><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Documento generado</DialogTitle><DialogDescription>{document.publicNumber}</DialogDescription></DialogHeader><div className="mt-6 grid gap-2 sm:grid-cols-2"><Button onClick={() => downloadDocument(document.blob, document.filename)}><Download size={17} />Descargar PDF</Button><Button variant="outline" onClick={print}><Printer size={17} />Imprimir</Button><Button variant="outline" onClick={() => { setOpen(false); onEdit() }}><Pencil size={17} />Editar documento</Button><Button variant="outline" onClick={() => { setOpen(false); setEmailOpen(true) }}><Mail size={17} />Enviar mail</Button></div><Button className="mt-5 w-full" variant="outline" onClick={onFinish}>Finalizar</Button></DialogContent></Dialog><DocumentEmailDialog documentId={document.documentId} publicNumber={document.publicNumber} open={emailOpen} onOpenChange={setEmailOpen} /></>
}
