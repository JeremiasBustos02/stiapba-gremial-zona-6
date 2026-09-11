package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
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
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;
    @Mock private AgreementRepository agreementRepository;

    @Test
    void adminListsAllRecordsDescendingByCreationDate() {
        DocumentHistoryService service = service();
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
        DocumentHistoryService service = service();
        UUID delegateId = UUID.randomUUID();
        when(documentRecordRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(record(delegateId))));

        var result = service.list(new UserPrincipal(delegateId, Role.DELEGADO, false), 0, 20);

        assertThat(result.content()).hasSize(1);
        verify(documentRecordRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void appliesFiltersWithinDelegateOwnershipScope() {
        DocumentHistoryService service = service();
        UUID delegateId = UUID.randomUUID();
        when(documentRecordRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(record(delegateId))));

        service.list(new UserPrincipal(delegateId, Role.DELEGADO, false), 0, 20, " PG-2026 ", DocumentType.PERMISO_GREMIAL,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), "ignored", "oldest");

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(documentRecordRepository).findAll(any(Specification.class), pageable.capture());
        assertThat(pageable.getValue().getSort().getOrderFor("createdAt").isAscending()).isTrue();
    }

    @Test
    void adminCanReadDetailAndIncompleteSnapshotUsesSafeFallbacks() {
        UUID id = UUID.randomUUID();
        UUID creatorId = UUID.randomUUID();
        DocumentRecord record = new DocumentRecord("PG-2026-000002", DocumentType.PERMISO_GREMIAL, creatorId, "Admin",
                UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 8, 18), "Empresa histórica", "Delegado histórico",
                Map.of("delegateDni", "12345678", "permitDay", "not-a-number"));
        when(documentRecordRepository.findById(id)).thenReturn(java.util.Optional.of(record));

        var result = service()
                .detail(id, new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false));

        assertThat(result.companyName()).isEqualTo("Empresa histórica");
        assertThat(result.delegateName()).isEqualTo("Delegado histórico");
        assertThat(result.delegateDni()).isEqualTo("12345678");
        assertThat(result.issueDate()).isEqualTo(LocalDate.of(2026, 8, 18));
        assertThat(result.permitDay()).isNull();
    }

    @Test
    void delegateCannotReadAnotherUsersDetail() {
        UUID ownerId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        when(documentRecordRepository.findById(id)).thenReturn(java.util.Optional.of(record(ownerId)));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service()
                        .detail(id, new UserPrincipal(UUID.randomUUID(), Role.DELEGADO, false)))
                .isInstanceOf(DocumentException.class)
                .hasMessageContaining("No tenés permisos");
    }

    @Test
    void suggestionsArePersonalAndOrderRecentAndFrequentWithoutDuplicates() {
        UUID userId = UUID.randomUUID();
        List<DocumentRecordRepository.SuggestionStat> stats = new ArrayList<>();
        List<Company> currentCompanies = new ArrayList<>();
        for (int index = 0; index < 8; index++) {
            UUID companyId = UUID.randomUUID();
            stats.add(stat(companyId, index < 5 ? 1 : 10 - index, OffsetDateTime.parse("2026-09-0" + (index + 1) + "T10:00:00Z")));
            Company company = org.mockito.Mockito.mock(Company.class);
            when(company.getId()).thenReturn(companyId);
            when(company.getNombre()).thenReturn("Empresa " + index);
            when(company.isActive()).thenReturn(true);
            currentCompanies.add(company);
        }
        when(documentRecordRepository.companySuggestionStats(userId)).thenReturn(stats);
        when(documentRecordRepository.delegateSuggestionStats(userId)).thenReturn(List.of());
        when(documentRecordRepository.agreementSuggestionStats(userId)).thenReturn(List.of());
        when(companyRepository.findAllById(any())).thenReturn(currentCompanies);
        when(userRepository.findAllById(any())).thenReturn(List.of());
        when(agreementRepository.findAllById(any())).thenReturn(List.of());

        var result = service().suggestions(new UserPrincipal(userId, Role.ADMIN, false));

        assertThat(result.companies().recent()).extracting("label")
                .containsExactly("Empresa 7", "Empresa 6", "Empresa 5", "Empresa 4", "Empresa 3");
        assertThat(result.companies().frequent()).extracting("label").containsExactly("Empresa 2", "Empresa 1", "Empresa 0");
        verify(documentRecordRepository).companySuggestionStats(userId);
        verify(documentRecordRepository).delegateSuggestionStats(userId);
        verify(documentRecordRepository).agreementSuggestionStats(userId);
    }

    @Test
    void suggestionsIgnoreMissingAndInactiveCatalogEntries() {
        UUID userId = UUID.randomUUID();
        UUID inactiveId = UUID.randomUUID();
        UUID missingId = UUID.randomUUID();
        List<DocumentRecordRepository.SuggestionStat> stats = List.of(
                stat(inactiveId, 3, OffsetDateTime.parse("2026-09-08T10:00:00Z")),
                stat(missingId, 2, OffsetDateTime.parse("2026-09-07T10:00:00Z")));
        when(documentRecordRepository.companySuggestionStats(userId)).thenReturn(stats);
        when(documentRecordRepository.delegateSuggestionStats(userId)).thenReturn(List.of());
        when(documentRecordRepository.agreementSuggestionStats(userId)).thenReturn(List.of());
        Company inactive = org.mockito.Mockito.mock(Company.class);
        org.mockito.Mockito.lenient().when(inactive.getId()).thenReturn(inactiveId);
        when(inactive.isActive()).thenReturn(false);
        when(companyRepository.findAllById(any())).thenReturn(List.of(inactive));
        when(userRepository.findAllById(any())).thenReturn(List.of());
        when(agreementRepository.findAllById(any())).thenReturn(List.of());

        var result = service().suggestions(new UserPrincipal(userId, Role.DELEGADO, false));

        assertThat(result.companies().recent()).isEmpty();
        assertThat(result.companies().frequent()).isEmpty();
    }

    private DocumentRecordRepository.SuggestionStat stat(UUID id, long uses, OffsetDateTime lastUsed) {
        DocumentRecordRepository.SuggestionStat stat = org.mockito.Mockito.mock(DocumentRecordRepository.SuggestionStat.class);
        when(stat.getId()).thenReturn(id);
        org.mockito.Mockito.lenient().when(stat.getUses()).thenReturn(uses);
        org.mockito.Mockito.lenient().when(stat.getLastUsed()).thenReturn(lastUsed);
        return stat;
    }

    private DocumentHistoryService service() {
        return new DocumentHistoryService(documentRecordRepository, companyRepository, userRepository, agreementRepository);
    }

    private DocumentRecord record(UUID creatorId) {
        return new DocumentRecord("PG-2026-000001", DocumentType.PERMISO_GREMIAL, creatorId, "Ana Pérez",
                UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 8, 18), "Empresa", "Delegada", Map.of("company", "Empresa"));
    }
}
