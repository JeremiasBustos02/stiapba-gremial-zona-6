package com.stiapba.documentmanagement.report;

import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.document.DocumentException;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.report.entity.MonthlyReport;
import com.stiapba.documentmanagement.report.repository.MonthlyReportRepository;
import com.stiapba.documentmanagement.report.storage.ReportFileStorage;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {
    @Mock DocumentRecordRepository documents;
    @Mock CompanyRepository companies;
    @Mock AgreementRepository agreements;
    @Mock UserRepository users;
    @Mock MonthlyReportRepository monthlyReports;
    @Mock ReportFileStorage reportFileStorage;

    @Test
    void summarizesAndExportsHistoricalSnapshotDataForTheRequestedPeriod() throws Exception {
        when(documents.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(record("Empresa", "Ana", "123", "CCT", "=PG"), record("Empresa", "Ana", "123", "CCT", "PG-2")));
        ReportService service = service(); UserPrincipal admin = new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false);
        var summary = service.summary(admin, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30));
        assertThat(summary.totalDocuments()).isEqualTo(2); assertThat(summary.uniqueCompanies()).isEqualTo(1); assertThat(summary.uniqueDelegates()).isEqualTo(1); assertThat(summary.uniqueAgreements()).isEqualTo(1);
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(service.exportReport(admin, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30))))) {
            assertThat(workbook.getSheet("Resumen")).isNotNull(); assertThat(workbook.getSheet("Documentos")).isNotNull(); assertThat(workbook.getSheet("Empresas")).isNotNull(); assertThat(workbook.getSheet("Delegados")).isNotNull(); assertThat(workbook.getSheet("Convenios")).isNotNull();
            assertThat(workbook.getSheet("Documentos").getRow(1).getCell(0).getStringCellValue()).isEqualTo("'=PG");
        }
    }

    @Test
    void rejectsDelegateAccess() {
        assertThatThrownBy(() -> service().generateMonthlyReport(new UserPrincipal(UUID.randomUUID(), Role.DELEGADO, false), 2026, 9)).isInstanceOf(DocumentException.class).hasMessageContaining("No tenés permisos");
    }

    @Test
    void generatesThePreviousMonthOnceAndReturnsTheExistingReportOnRetry() throws Exception {
        YearMonth period = YearMonth.now().minusMonths(1); LocalDate start = period.atDay(1);
        MonthlyReport existing = new MonthlyReport(start, period.atEndOfMonth(), OffsetDateTime.now(), "reporte-" + period + ".xlsx", "reports/%d/%02d/reporte-%s.xlsx".formatted(period.getYear(), period.getMonthValue(), period));
        when(monthlyReports.findByPeriodStart(start)).thenReturn(Optional.empty(), Optional.of(existing));
        when(documents.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(record("Empresa", "Ana", "123", "CCT", "PG-1")));
        when(monthlyReports.saveAndFlush(any(MonthlyReport.class))).thenReturn(existing);

        var generated = service().generateMonthlyReport(admin(), period.getYear(), period.getMonthValue());
        var retried = service().generateMonthlyReport(admin(), period.getYear(), period.getMonthValue());

        assertThat(generated.periodStart()).isEqualTo(start); assertThat(retried.periodStart()).isEqualTo(start);
        verify(reportFileStorage).store(eq(existing.getStorageKey()), any(byte[].class));
        verify(monthlyReports).saveAndFlush(any(MonthlyReport.class));
    }

    @Test
    void rejectsInvalidAndFutureMonthlyPeriods() {
        assertThatThrownBy(() -> service().generateMonthlyReport(admin(), 2026, 13)).isInstanceOf(DocumentException.class).hasMessageContaining("no es válido");
        YearMonth future = YearMonth.now().plusMonths(1);
        assertThatThrownBy(() -> service().generateMonthlyReport(admin(), future.getYear(), future.getMonthValue())).isInstanceOf(DocumentException.class).hasMessageContaining("meses futuros");
    }

    @Test
    void doesNotPersistMetadataWhenStorageFails() throws Exception {
        YearMonth period = YearMonth.now().minusMonths(1);
        when(monthlyReports.findByPeriodStart(period.atDay(1))).thenReturn(Optional.empty());
        when(documents.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(record("Empresa", "Ana", "123", "CCT", "PG-1")));
        org.mockito.Mockito.doThrow(new java.io.IOException("storage")).when(reportFileStorage).store(anyString(), any(byte[].class));

        assertThatThrownBy(() -> service().generateMonthlyReport(admin(), period.getYear(), period.getMonthValue())).isInstanceOf(DocumentException.class).hasMessageContaining("guardar el reporte mensual");
        verify(monthlyReports, never()).saveAndFlush(any());
    }

    @Test
    void listsNewestFirstAndDownloadsTheStoredFile() throws Exception {
        MonthlyReport newer = monthly(YearMonth.now().minusMonths(1)); MonthlyReport older = monthly(YearMonth.now().minusMonths(2));
        ReflectionTestUtils.setField(newer, "id", UUID.randomUUID());
        when(monthlyReports.findAllByOrderByPeriodStartDesc()).thenReturn(List.of(newer, older));
        when(monthlyReports.findById(newer.getId())).thenReturn(Optional.of(newer));
        when(reportFileStorage.load(newer.getStorageKey())).thenReturn(new byte[]{'P', 'K'});

        assertThat(service().listMonthlyReports(admin())).extracting(ReportDtos.MonthlyReportResponse::periodStart).containsExactly(newer.getPeriodStart(), older.getPeriodStart());
        assertThat(service().downloadMonthlyReport(admin(), newer.getId())).containsExactly('P', 'K');
    }

    private ReportService service() { return new ReportService(documents, companies, agreements, users, monthlyReports, reportFileStorage); }
    private UserPrincipal admin() { return new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false); }
    private MonthlyReport monthly(YearMonth period) { return new MonthlyReport(period.atDay(1), period.atEndOfMonth(), OffsetDateTime.now(), "reporte-" + period + ".xlsx", "reports/%d/%02d/reporte-%s.xlsx".formatted(period.getYear(), period.getMonthValue(), period)); }
    private DocumentRecord record(String company, String delegate, String dni, String agreement, String number) { return new DocumentRecord(number, DocumentType.PERMISO_GREMIAL, UUID.randomUUID(), "Admin", UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 9, 10), company, delegate, Map.of("companyName", company, "delegateName", delegate, "delegateDni", dni, "agreementCode", agreement)); }
}
