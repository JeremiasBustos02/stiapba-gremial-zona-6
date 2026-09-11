import type { GeneratedDocument } from './documentsApi'
import { DisabledEmailAction } from './DisabledEmailAction'
import { ActionGroup, ActionGroupItem } from '@/components/ui/action-group'

export function PostGenerationActions({ inline = false }: { document: GeneratedDocument; onSuccess?: (message: string) => void; inline?: boolean }) {
  if (inline) return <DisabledEmailAction label="Enviar por mail" grouped />

  return <section className="post-generation-actions mt-3 max-w-3xl">
    <ActionGroup aria-label="Acciones adicionales del documento">
      <ActionGroupItem><DisabledEmailAction label="Enviar por mail" /></ActionGroupItem>
    </ActionGroup>
  </section>
}
