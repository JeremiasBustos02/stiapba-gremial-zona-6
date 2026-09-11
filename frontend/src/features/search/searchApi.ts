import { apiRequest } from '@/lib/api'
import type { DocumentHistoryRecord } from '@/features/documents/documentsApi'

export type SearchItem = { id: string; label: string; secondaryLabel: string }
export type SearchResponse = {
  documents: DocumentHistoryRecord[]
  companies: SearchItem[]
  delegates: SearchItem[]
  agreements: SearchItem[]
}

export function searchGlobal(query: string) {
  return apiRequest<SearchResponse>(`/search?q=${encodeURIComponent(query.trim())}`)
}
