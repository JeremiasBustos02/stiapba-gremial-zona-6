import { apiRequest, apiRequestBlobWithHeaders } from '@/lib/api'

export type ReportSummary = { dateFrom: string; dateTo: string; totalDocuments: number; uniqueDelegates: number; uniqueCompanies: number; uniqueAgreements: number }
export const getReportSummary = (dateFrom: string, dateTo: string) => apiRequest<ReportSummary>(`/admin/reports/summary?${new URLSearchParams({ dateFrom, dateTo })}`)
export const exportReport = (dateFrom: string, dateTo: string) => apiRequestBlobWithHeaders(`/admin/reports/export?${new URLSearchParams({ dateFrom, dateTo })}`)
export const exportCatalog = (catalog: 'companies' | 'delegates' | 'agreements' | 'users') => apiRequestBlobWithHeaders(`/admin/exports/${catalog}`)
