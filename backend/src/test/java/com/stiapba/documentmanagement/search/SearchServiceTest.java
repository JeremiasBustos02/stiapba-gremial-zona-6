package com.stiapba.documentmanagement.search;

import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
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
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {
    @Mock private DocumentRecordRepository documentRecordRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;
    @Mock private AgreementRepository agreementRepository;

    @Test
    void returnsEmptyResultsForShortQueries() {
        var result = service().search("a", new UserPrincipal(UUID.randomUUID(), Role.DELEGADO, false));

        assertThat(result.documents()).isEmpty();
        verify(documentRecordRepository, org.mockito.Mockito.never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void limitsDocumentsAndUsesDescendingCreationOrder() {
        UUID delegateId = UUID.randomUUID();
        DocumentRecord record = new DocumentRecord("PG-2026-000001", DocumentType.PERMISO_GREMIAL, delegateId, "Delegado",
                UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 9, 11), "Empresa", "Delegado", Map.of());
        when(documentRecordRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(record)));
        when(companyRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());
        when(userRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());
        when(agreementRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        var result = service().search("Empresa", new UserPrincipal(delegateId, Role.DELEGADO, false));

        assertThat(result.documents()).hasSize(1);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(documentRecordRepository).findAll(any(Specification.class), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(5);
        assertThat(pageable.getValue().getSort().getOrderFor("createdAt").isDescending()).isTrue();
    }

    private SearchService service() {
        return new SearchService(documentRecordRepository, companyRepository, userRepository, agreementRepository);
    }
}
