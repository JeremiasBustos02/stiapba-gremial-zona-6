package com.stiapba.documentmanagement.report;

import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.document.DocumentException;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
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

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {
    @Mock DocumentRecordRepository documents;
    @Mock CompanyRepository companies;
    @Mock AgreementRepository agreements;
    @Mock UserRepository users;

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
        assertThatThrownBy(() -> service().summary(new UserPrincipal(UUID.randomUUID(), Role.DELEGADO, false), LocalDate.now(), LocalDate.now())).isInstanceOf(DocumentException.class).hasMessageContaining("No tenés permisos");
    }

    private ReportService service() { return new ReportService(documents, companies, agreements, users); }
    private DocumentRecord record(String company, String delegate, String dni, String agreement, String number) { return new DocumentRecord(number, DocumentType.PERMISO_GREMIAL, UUID.randomUUID(), "Admin", UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 9, 10), company, delegate, Map.of("companyName", company, "delegateName", delegate, "delegateDni", dni, "agreementCode", agreement)); }
}
