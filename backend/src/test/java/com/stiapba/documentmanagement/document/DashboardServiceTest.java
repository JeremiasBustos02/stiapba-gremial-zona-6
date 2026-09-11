package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.user.entity.Role;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {
    @Mock private DocumentRecordRepository documentRecordRepository;

    @Test
    void delegateReceivesOnlyOwnAggregatesAndRecentActivity() {
        UUID userId = UUID.randomUUID();
        DocumentRecord record = record(userId, "Empresa propia");
        when(documentRecordRepository.countByCreatedByUserIdAndCreatedAtGreaterThanEqual(eq(userId), any())).thenReturn(2L);
        when(documentRecordRepository.countByCreatedByUserId(userId)).thenReturn(4L);
        when(documentRecordRepository.findTop5ByCreatedByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(record));

        var result = new DashboardService(documentRecordRepository).getDashboard(new UserPrincipal(userId, Role.DELEGADO, false));

        assertThat(result.documentsThisMonth()).isEqualTo(2);
        assertThat(result.totalDocuments()).isEqualTo(4);
        assertThat(result.latestDocument().companyName()).isEqualTo("Empresa propia");
        assertThat(result.recentActivity()).hasSize(1);
        verify(documentRecordRepository).countByCreatedByUserIdAndCreatedAtGreaterThanEqual(eq(userId), any());
    }

    @Test
    void adminReceivesGlobalAggregatesAndEmptyStateWhenThereAreNoDocuments() {
        when(documentRecordRepository.countByCreatedAtGreaterThanEqual(any())).thenReturn(0L);
        when(documentRecordRepository.count()).thenReturn(0L);
        when(documentRecordRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of());

        var result = new DashboardService(documentRecordRepository).getDashboard(new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false));

        assertThat(result.documentsThisMonth()).isZero();
        assertThat(result.totalDocuments()).isZero();
        assertThat(result.latestDocument()).isNull();
        assertThat(result.recentActivity()).isEmpty();
    }

    private DocumentRecord record(UUID ownerId, String company) {
        return new DocumentRecord("PG-2026-000001", DocumentType.PERMISO_GREMIAL, ownerId, "Juan Pérez",
                UUID.randomUUID(), UUID.randomUUID(), java.time.LocalDate.of(2026, 9, 10), company, "Ana Paz", Map.of());
    }
}
