package com.stiapba.documentmanagement.search;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.document.DocumentHistoryDtos.DocumentHistoryResponse;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.search.SearchDtos.SearchItem;
import com.stiapba.documentmanagement.search.SearchDtos.SearchResponse;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SearchService {
    private static final int DOCUMENT_LIMIT = 5;
    private static final int CATALOG_LIMIT = 4;

    private final DocumentRecordRepository documentRecordRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final AgreementRepository agreementRepository;

    public SearchService(DocumentRecordRepository documentRecordRepository, CompanyRepository companyRepository,
                         UserRepository userRepository, AgreementRepository agreementRepository) {
        this.documentRecordRepository = documentRecordRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.agreementRepository = agreementRepository;
    }

    public SearchResponse search(String query, UserPrincipal principal) {
        String value = normalize(query);
        if (value == null || value.length() < 2) {
            return new SearchResponse(List.of(), List.of(), List.of(), List.of());
        }
        String pattern = "%" + value.toLowerCase() + "%";
        Specification<DocumentRecord> documents = Specification.allOf(
                principal.role() == Role.ADMIN ? null : (root, ignored, builder) -> builder.equal(root.get("createdByUserId"), principal.id()),
                (root, ignored, builder) -> builder.or(
                        builder.like(builder.lower(root.get("publicNumber")), pattern),
                        builder.like(builder.lower(root.get("companyName")), pattern),
                        builder.like(builder.lower(root.get("delegateName")), pattern)));
        List<DocumentHistoryResponse> documentResults = documentRecordRepository.findAll(
                        documents, PageRequest.of(0, DOCUMENT_LIMIT, Sort.by("createdAt").descending()))
                .stream().map(this::toDocument).toList();

        Specification<Company> companies = Specification.allOf(
                (root, ignored, builder) -> builder.isTrue(root.get("active")),
                (root, ignored, builder) -> builder.like(builder.lower(root.get("nombre")), pattern));
        List<SearchItem> companyResults = companyRepository.findAll(companies, Sort.by("nombre").ascending()).stream()
                .limit(CATALOG_LIMIT).map(company -> new SearchItem(company.getId(), company.getNombre(), "Empresa")).toList();

        Specification<User> delegates = Specification.allOf(
                (root, ignored, builder) -> builder.isTrue(root.get("active")),
                (root, ignored, builder) -> builder.equal(root.get("role"), Role.DELEGADO),
                (root, ignored, builder) -> builder.or(
                        builder.like(builder.lower(root.get("nombre")), pattern),
                        builder.like(builder.lower(root.get("apellido")), pattern),
                        builder.like(builder.lower(root.get("dni")), pattern)));
        List<SearchItem> delegateResults = userRepository.findAll(delegates, Sort.by("apellido").ascending().and(Sort.by("nombre").ascending())).stream()
                .limit(CATALOG_LIMIT).map(user -> new SearchItem(user.getId(), user.getNombre() + " " + user.getApellido(), "DNI " + user.getDni())).toList();

        Specification<Agreement> agreements = Specification.allOf(
                (root, ignored, builder) -> builder.isTrue(root.get("active")),
                (root, ignored, builder) -> builder.or(
                        builder.like(builder.lower(root.get("descripcion")), pattern),
                        builder.like(builder.lower(root.get("codigo")), pattern)));
        List<SearchItem> agreementResults = agreementRepository.findAll(agreements, Sort.by("descripcion").ascending()).stream()
                .limit(CATALOG_LIMIT).map(agreement -> new SearchItem(agreement.getId(), agreementLabel(agreement), "Convenio")).toList();

        return new SearchResponse(documentResults, companyResults, delegateResults, agreementResults);
    }

    private DocumentHistoryResponse toDocument(DocumentRecord record) {
        return new DocumentHistoryResponse(record.getId(), record.getPublicNumber(), record.getDocumentType(), record.getCreatedAt(),
                record.getCreatedByName(), record.getCompanyName(), record.getDelegateName(), record.getIssueDate());
    }

    private String agreementLabel(Agreement agreement) {
        return agreement.getCodigo() == null || agreement.getCodigo().isBlank()
                ? agreement.getDescripcion() : agreement.getCodigo() + " - " + agreement.getDescripcion();
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
