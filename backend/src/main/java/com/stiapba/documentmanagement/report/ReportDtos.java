package com.stiapba.documentmanagement.report;

import java.time.LocalDate;

public final class ReportDtos {
    private ReportDtos() {}

    public record ReportSummary(LocalDate dateFrom, LocalDate dateTo, long totalDocuments, long uniqueDelegates,
                                long uniqueCompanies, long uniqueAgreements) {}
}
