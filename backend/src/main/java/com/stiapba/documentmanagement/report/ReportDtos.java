package com.stiapba.documentmanagement.report;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class ReportDtos {
    private ReportDtos() {}

    public record ReportSummary(LocalDate dateFrom, LocalDate dateTo, long totalDocuments, long uniqueDelegates,
                                long uniqueCompanies, long uniqueAgreements) {}

    public record MonthlyReportResponse(UUID id, LocalDate periodStart, LocalDate periodEnd, OffsetDateTime generatedAt,
                                        String filename, String status) {}
}
