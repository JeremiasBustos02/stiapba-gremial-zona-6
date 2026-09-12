package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.user.entity.Role;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DocumentHistoryExportControllerTest {
    @Test
    void returnsSpreadsheetHeadersAndDelegatesAllHistoryFiltersToService() {
        DocumentHistoryService historyService = mock(DocumentHistoryService.class);
        UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false);
        when(historyService.export(principal, "PG", DocumentType.PERMISO_GREMIAL, LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 9, 30), "Admin", "oldest")).thenReturn(new byte[]{'P', 'K'});
        DocumentController controller = new DocumentController(mock(DocumentGenerationService.class), historyService,
                mock(DocumentEmailService.class), mock(DashboardService.class));

        var response = controller.exportHistory(principal, "PG", DocumentType.PERMISO_GREMIAL, LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 9, 30), "Admin", "oldest");

        assertThat(response.getHeaders().getContentType().toString())
                .isEqualTo("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .contains("attachment").contains("historial-documentos-").contains(".xlsx");
        assertThat(response.getBody()).containsExactly('P', 'K');
        verify(historyService).export(principal, "PG", DocumentType.PERMISO_GREMIAL, LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 9, 30), "Admin", "oldest");
    }
}
