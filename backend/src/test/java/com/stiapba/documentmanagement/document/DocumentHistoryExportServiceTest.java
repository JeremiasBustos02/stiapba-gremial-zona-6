package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentHistoryExportServiceTest {
    @Mock private DocumentRecordRepository documentRecordRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;
    @Mock private AgreementRepository agreementRepository;

    @Test
    void exportsAllFilteredRecordsWithoutPaginationAndCreatesReadableWorkbook() throws Exception {
        List<DocumentRecord> records = java.util.stream.IntStream.range(0, 237)
                .mapToObj(index -> record("PG-2026-%06d".formatted(index), UUID.randomUUID(), Map.of(
                        "delegateDni", "12345678", "agreementCode", "CCT-1")))
                .toList();
        when(documentRecordRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(records);

        byte[] result = service().export(new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false), "PG-2026",
                DocumentType.PERMISO_GREMIAL, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30), "Admin", "oldest");

        assertThat(result).startsWith((byte) 'P', (byte) 'K');
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(result))) {
            var sheet = workbook.getSheet("Documentos");
            assertThat(sheet.getLastRowNum()).isEqualTo(237);
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Número");
            assertThat(sheet.getRow(0).getCell(8).getStringCellValue()).isEqualTo("Fecha de generación");
            assertThat(sheet.getCTWorksheet().isSetAutoFilter()).isTrue();
            assertThat(sheet.getCTWorksheet().getAutoFilter().getRef()).isEqualTo("A1:I238");
            assertThat(sheet.getPaneInformation().isFreezePane()).isTrue();
        }
        ArgumentCaptor<Sort> sort = ArgumentCaptor.forClass(Sort.class);
        verify(documentRecordRepository).findAll(any(Specification.class), sort.capture());
        assertThat(sort.getValue().getOrderFor("createdAt").isAscending()).isTrue();
    }

    @Test
    void delegateExportUsesSameFilteredRepositoryQueryAndIncompleteSnapshotsRemainExportable() throws Exception {
        UUID delegateId = UUID.randomUUID();
        when(documentRecordRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(record("PG-2026-000001", delegateId, Map.of())));

        byte[] result = service().export(new UserPrincipal(delegateId, Role.DELEGADO, false), null, null,
                null, null, "other user", "newest");

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(result))) {
            var row = workbook.getSheet("Documentos").getRow(1);
            assertThat(row.getCell(5).getStringCellValue()).isEmpty();
            assertThat(row.getCell(6).getStringCellValue()).isEmpty();
        }
        ArgumentCaptor<Specification<DocumentRecord>> specification = ArgumentCaptor.forClass(Specification.class);
        verify(documentRecordRepository).findAll(specification.capture(), any(Sort.class));
        Root<DocumentRecord> root = org.mockito.Mockito.mock(Root.class);
        Path<Object> ownerPath = org.mockito.Mockito.mock(Path.class);
        CriteriaBuilder builder = org.mockito.Mockito.mock(CriteriaBuilder.class);
        when(root.get("createdByUserId")).thenReturn(ownerPath);
        when(builder.equal(ownerPath, delegateId)).thenReturn(org.mockito.Mockito.mock(Predicate.class));
        specification.getValue().toPredicate(root, null, builder);
        verify(builder).equal(ownerPath, delegateId);
    }

    @Test
    void neutralizesExcelFormulaPrefixes() {
        assertThat(DocumentHistoryService.safeExcelText("=SUM(A1:A2)")).isEqualTo("'=SUM(A1:A2)");
        assertThat(DocumentHistoryService.safeExcelText("+value")).isEqualTo("'+value");
        assertThat(DocumentHistoryService.safeExcelText("-value")).isEqualTo("'-value");
        assertThat(DocumentHistoryService.safeExcelText("@value")).isEqualTo("'@value");
        assertThat(DocumentHistoryService.safeExcelText("  =SUM(A1:A2)")).isEqualTo("'  =SUM(A1:A2)");
        assertThat(DocumentHistoryService.safeExcelText("Normal")).isEqualTo("Normal");
    }

    private DocumentHistoryService service() {
        return new DocumentHistoryService(documentRecordRepository, companyRepository, userRepository, agreementRepository);
    }

    private DocumentRecord record(String number, UUID creatorId, Map<String, String> snapshot) {
        return new DocumentRecord(number, DocumentType.PERMISO_GREMIAL, creatorId, "Admin STIA", UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.of(2026, 9, 10), "Empresa", "Delegada", snapshot);
    }
}
