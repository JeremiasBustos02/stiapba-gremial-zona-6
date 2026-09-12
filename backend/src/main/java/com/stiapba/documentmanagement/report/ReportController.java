package com.stiapba.documentmanagement.report;

import com.stiapba.documentmanagement.security.UserPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class ReportController {
    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    private final ReportService reportService;

    public ReportController(ReportService reportService) { this.reportService = reportService; }

    @GetMapping("/reports/summary")
    public ReportDtos.ReportSummary summary(@AuthenticationPrincipal UserPrincipal principal,
                                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return reportService.summary(principal, dateFrom, dateTo);
    }

    @GetMapping(value = "/reports/export", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportReport(@AuthenticationPrincipal UserPrincipal principal,
                                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return attachment(reportService.exportReport(principal, dateFrom, dateTo), "reporte-actividad-" + dateFrom + "-a-" + dateTo + ".xlsx");
    }

    @GetMapping(value = "/exports/{catalog}", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportCatalog(@AuthenticationPrincipal UserPrincipal principal, @PathVariable String catalog) {
        return attachment(reportService.exportCatalog(principal, catalog), "exportacion-" + catalog + ".xlsx");
    }

    @GetMapping("/reports/monthly")
    public List<ReportDtos.MonthlyReportResponse> listMonthlyReports(@AuthenticationPrincipal UserPrincipal principal) {
        return reportService.listMonthlyReports(principal);
    }

    @PostMapping("/reports/monthly/{year}/{month}")
    public ReportDtos.MonthlyReportResponse generateMonthlyReport(@AuthenticationPrincipal UserPrincipal principal,
                                                                   @PathVariable int year, @PathVariable int month) {
        return reportService.generateMonthlyReport(principal, year, month);
    }

    @GetMapping("/reports/monthly/{id}")
    public ReportDtos.MonthlyReportResponse monthlyReport(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return reportService.monthlyReport(principal, id);
    }

    @GetMapping(value = "/reports/monthly/{id}/download", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> downloadMonthlyReport(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        ReportDtos.MonthlyReportResponse report = reportService.monthlyReport(principal, id);
        return attachment(reportService.downloadMonthlyReport(principal, id), report.filename());
    }

    private ResponseEntity<byte[]> attachment(byte[] content, String filename) {
        return ResponseEntity.ok().contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString()).body(content);
    }
}
