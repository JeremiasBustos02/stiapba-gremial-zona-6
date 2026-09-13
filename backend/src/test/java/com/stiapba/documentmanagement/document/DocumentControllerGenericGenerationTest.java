package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.user.entity.Role;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DocumentControllerGenericGenerationTest {
    @Test
    void delegatesGenericGenerationWithoutChoosingATypeInTheController() {
        DocumentGenerationService generation = mock(DocumentGenerationService.class);
        DocumentGenerationRequest request = new DocumentGenerationRequest(DocumentType.PERMISO_GREMIAL, UUID.randomUUID(), Map.of(), Map.of());
        UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), Role.DELEGADO, false);
        when(generation.generate(request, principal)).thenReturn(new DocumentGenerationService.GeneratedDocument(new byte[] {1}, UUID.randomUUID(),
                "PG-2026-000001", "pg-2026-000001_permiso-gremial_ana-paz.pdf"));

        var response = new DocumentController(generation, mock(DocumentHistoryService.class), mock(DocumentEmailService.class),
                mock(DashboardService.class)).generate(request, principal);

        assertThat(response.getHeaders().getFirst("X-Public-Number")).isEqualTo("PG-2026-000001");
        assertThat(response.getBody()).containsExactly(1);
        verify(generation).generate(request, principal);
    }
}
