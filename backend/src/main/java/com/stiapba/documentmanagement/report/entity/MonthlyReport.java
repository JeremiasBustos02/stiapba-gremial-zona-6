package com.stiapba.documentmanagement.report.entity;

import com.stiapba.documentmanagement.common.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "monthly_reports")
public class MonthlyReport extends AuditableEntity {
    @Column(name = "period_start", nullable = false, unique = true)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "generated_at", nullable = false)
    private OffsetDateTime generatedAt;

    @Column(nullable = false, length = 200)
    private String filename;

    @Column(name = "storage_key", nullable = false, length = 300)
    private String storageKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MonthlyReportStatus status;

    protected MonthlyReport() {
    }

    public MonthlyReport(LocalDate periodStart, LocalDate periodEnd, OffsetDateTime generatedAt, String filename, String storageKey) {
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
        this.generatedAt = generatedAt;
        this.filename = filename;
        this.storageKey = storageKey;
        this.status = MonthlyReportStatus.AVAILABLE;
    }

    public LocalDate getPeriodStart() { return periodStart; }
    public LocalDate getPeriodEnd() { return periodEnd; }
    public OffsetDateTime getGeneratedAt() { return generatedAt; }
    public String getFilename() { return filename; }
    public String getStorageKey() { return storageKey; }
    public MonthlyReportStatus getStatus() { return status; }
}
