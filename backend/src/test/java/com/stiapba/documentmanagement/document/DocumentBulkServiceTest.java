package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DocumentBulkServiceTest {
    @Mock DocumentGenerationService generation;
    @Mock UserRepository users;

    @Test
    void keepsSuccessfulDocumentsWhenOneDelegateFails() {
        UUID first = UUID.randomUUID(); UUID second = UUID.randomUUID(); UUID documentId = UUID.randomUUID();
        when(users.findById(first)).thenReturn(Optional.of(user("Ana", "Paz")));
        when(users.findById(second)).thenReturn(Optional.of(user("Beto", "Luna")));
        when(generation.generate(any(), any())).thenReturn(new DocumentGenerationService.GeneratedDocument(new byte[]{1}, documentId, "PG-2026-000001", "pg-2026-000001_ana.pdf"))
                .thenThrow(new DocumentException(404, "DELEGATE_NOT_FOUND", "No encontramos un delegado activo."));

        var result = service().generate(request(List.of(first, second)), principal());

        assertThat(result.requested()).isEqualTo(2); assertThat(result.successful()).isEqualTo(1); assertThat(result.failed()).isEqualTo(1);
        assertThat(result.items().get(0).documentId()).isEqualTo(documentId);
        assertThat(result.items().get(1).errorCode()).isEqualTo("DELEGATE_NOT_FOUND");
        verify(generation).generate(org.mockito.ArgumentMatchers.argThat(request -> request.baseValues().get("delegateId").equals(first.toString())), any());
        verify(generation).generate(org.mockito.ArgumentMatchers.argThat(request -> request.baseValues().get("delegateId").equals(second.toString())), any());
    }

    @Test
    void rejectsDuplicateDelegatesBeforeGenerating() {
        UUID delegateId = UUID.randomUUID();
        assertThatThrownBy(() -> service().generate(request(List.of(delegateId, delegateId)), principal()))
                .isInstanceOf(DocumentException.class).hasMessageContaining("repetir delegados");
    }

    @Test
    void createsZipFromAuthorizedRegeneratedDocuments() throws Exception {
        UUID first = UUID.randomUUID(); UUID second = UUID.randomUUID();
        when(generation.regenerate(eq(first), any())).thenReturn(new DocumentGenerationService.GeneratedDocument(new byte[]{1}, first, "PG-2026-000001", "pg-2026-000001_ana.pdf"));
        when(generation.regenerate(eq(second), any())).thenReturn(new DocumentGenerationService.GeneratedDocument(new byte[]{2}, second, "PG-2026-000002", "pg-2026-000002_beto.pdf"));

        var archive = service().zip(new DocumentBulkDtos.ZipRequest(List.of(first, second)), principal());

        try (ZipInputStream input = new ZipInputStream(new ByteArrayInputStream(archive.content()))) {
            assertThat(input.getNextEntry().getName()).isEqualTo("pg-2026-000001_ana.pdf");
            assertThat(input.getNextEntry().getName()).isEqualTo("pg-2026-000002_beto.pdf");
        }
    }

    private DocumentBulkService service() { return new DocumentBulkService(generation, users); }
    private UserPrincipal principal() { return new UserPrincipal(UUID.randomUUID(), Role.DELEGADO, false); }
    private DocumentBulkRequest request(List<UUID> delegates) {
        return new DocumentBulkRequest(com.stiapba.documentmanagement.template.entity.DocumentType.PERMISO_GREMIAL, UUID.randomUUID(),
                Map.of("provinceId", UUID.randomUUID().toString(), "issueDate", "2026-09-12", "companyId", UUID.randomUUID().toString(),
                        "permitDay", "12", "agreementId", UUID.randomUUID().toString()), Map.of(), delegates);
    }
    private User user(String name, String lastName) { return new User(name, lastName, "12345678", "hash", Role.DELEGADO); }
}
