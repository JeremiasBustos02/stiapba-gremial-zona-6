import type { ReactNode } from 'react'
import type { DocumentBaseField } from './documentTypeDefinition'

export function DocumentBaseFields({ fields, renderField }: { fields: readonly DocumentBaseField[]; renderField: (field: DocumentBaseField) => ReactNode }) {
  return fields.map((field) => <div key={field.key}>{renderField(field)}</div>)
}
