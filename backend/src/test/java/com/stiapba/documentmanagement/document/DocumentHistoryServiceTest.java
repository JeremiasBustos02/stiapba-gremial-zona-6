package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.user.entity.Role;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentHistoryServiceTest {
    @Mock private DocumentRecordRepository documentRecordRepository;

    @Test
    void adminListsAllRecordsDescendingByCreationDate() {
        DocumentHistoryService service = new DocumentHistoryService(documentRecordRepository);
        DocumentRecord record = record(UUID.randomUUID());
        when(documentRecordRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(record)));

        var result = service.list(new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false), 0, 20);

        assertThat(result.content()).hasSize(1);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(documentRecordRepository).findAll(any(Specification.class), pageable.capture());
        assertThat(pageable.getValue().getSort().getOrderFor("createdAt").isDescending()).isTrue();
    }

    @Test
    void delegateListsOnlyOwnRecords() {
        DocumentHistoryService service = new DocumentHistoryService(documentRecordRepository);
        UUID delegateId = UUID.randomUUID();
        when(documentRecordRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(record(delegateId))));

        var result = service.list(new UserPrincipal(delegateId, Role.DELEGADO, false), 0, 20);

        assertThat(result.content()).hasSize(1);
        verify(documentRecordRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void appliesFiltersWithinDelegateOwnershipScope() {
        DocumentHistoryService service = new DocumentHistoryService(documentRecordRepository);
        UUID delegateId = UUID.randomUUID();
        when(documentRecordRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(record(delegateId))));

        service.list(new UserPrincipal(delegateId, Role.DELEGADO, false), 0, 20, " PG-2026 ", DocumentType.PERMISO_GREMIAL,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), "ignored", "oldest");

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(documentRecordRepository).findAll(any(Specification.class), pageable.capture());
        assertThat(pageable.getValue().getSort().getOrderFor("createdAt").isAscending()).isTrue();
    }

    private DocumentRecord record(UUID creatorId) {
        return new DocumentRecord("PG-2026-000001", DocumentType.PERMISO_GREMIAL, creatorId, "Ana Pérez",
                UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 8, 18), "Empresa", "Delegada", Map.of("company", "Empresa"));
    }
}
