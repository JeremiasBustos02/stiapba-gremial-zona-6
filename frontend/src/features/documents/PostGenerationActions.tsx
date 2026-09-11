import { Mail } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { GeneratedDocument } from './documentsApi'
import { DocumentEmailDialog } from './DocumentEmailDialog'

export function PostGenerationActions({ document, onSuccess }: { document: GeneratedDocument; onSuccess?: (message: string) => void }) {
  const [emailOpen, setEmailOpen] = useState(false)
  return <><section className="mt-3 max-w-3xl rounded-xl border border-slate-200 bg-white p-3">
    <Button className="w-full" variant="outline" onClick={() => setEmailOpen(true)}><Mail size={17} />Enviar mail</Button>
  </section><DocumentEmailDialog documentId={document.documentId} publicNumber={document.publicNumber} open={emailOpen} onOpenChange={setEmailOpen} onSuccess={onSuccess} /></>
}
