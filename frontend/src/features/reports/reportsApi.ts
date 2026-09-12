import { apiRequest, apiRequestBlobWithHeaders } from '@/lib/api'

export type ReportSummary = { dateFrom: string; dateTo: string; totalDocuments: number; uniqueDelegates: number; uniqueCompanies: number; uniqueAgreements: number }
export type MonthlyReport = { id: string; periodStart: string; periodEnd: string; generatedAt: string; filename: string; status: 'AVAILABLE' }
export const getReportSummary = (dateFrom: string, dateTo: string) => apiRequest<ReportSummary>(`/admin/reports/summary?${new URLSearchParams({ dateFrom, dateTo })}`)
export const exportReport = (dateFrom: string, dateTo: string) => apiRequestBlobWithHeaders(`/admin/reports/export?${new URLSearchParams({ dateFrom, dateTo })}`)
export const exportCatalog = (catalog: 'companies' | 'delegates' | 'agreements' | 'users') => apiRequestBlobWithHeaders(`/admin/exports/${catalog}`)
export const getMonthlyReports = () => apiRequest<MonthlyReport[]>('/admin/reports/monthly')
export const generateMonthlyReport = (year: number, month: number) => apiRequest<MonthlyReport>(`/admin/reports/monthly/${year}/${month}`, { method: 'POST' })
export const downloadMonthlyReport = (id: string) => apiRequestBlobWithHeaders(`/admin/reports/monthly/${id}/download`)
