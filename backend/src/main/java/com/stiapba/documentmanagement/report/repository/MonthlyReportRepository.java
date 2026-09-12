package com.stiapba.documentmanagement.report.repository;

import com.stiapba.documentmanagement.report.entity.MonthlyReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MonthlyReportRepository extends JpaRepository<MonthlyReport, UUID> {
    Optional<MonthlyReport> findByPeriodStart(LocalDate periodStart);
    List<MonthlyReport> findAllByOrderByPeriodStartDesc();
}
