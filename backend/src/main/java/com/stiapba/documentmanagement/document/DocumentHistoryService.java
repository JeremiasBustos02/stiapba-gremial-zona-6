package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.document.DocumentHistoryDtos.DocumentHistoryPageResponse;
import com.stiapba.documentmanagement.document.DocumentHistoryDtos.DocumentHistoryResponse;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.user.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class DocumentHistoryService {
    private final DocumentRecordRepository documentRecordRepository;

    public DocumentHistoryService(DocumentRecordRepository documentRecordRepository) {
        this.documentRecordRepository = documentRecordRepository;
    }

    public DocumentHistoryPageResponse list(UserPrincipal principal, int page, int size) {
        return list(principal, page, size, null, null, null, null, null, "newest");
    }

    public DocumentHistoryPageResponse list(UserPrincipal principal, int page, int size, String query, DocumentType documentType,
                                            LocalDate issueDateFrom, LocalDate issueDateTo, String createdBy, String order) {
        if (page < 0 || size < 1 || size > 100) {
            throw new DocumentException(400, "INVALID_PAGINATION", "Los parámetros de paginación no son válidos.");
        }
        if (issueDateFrom != null && issueDateTo != null && issueDateFrom.isAfter(issueDateTo)) {
            throw new DocumentException(400, "INVALID_DATE_RANGE", "La fecha desde no puede ser posterior a la fecha hasta.");
        }
        Sort sort = switch (order == null ? "newest" : order) {
            case "newest" -> Sort.by("createdAt").descending();
            case "oldest" -> Sort.by("createdAt").ascending();
            default -> throw new DocumentException(400, "INVALID_HISTORY_ORDER", "El orden del historial no es válido.");
        };
        Pageable pageable = PageRequest.of(page, size, sort);
        Specification<DocumentRecord> specification = Specification.allOf(
                principal.role() == Role.ADMIN ? null : (root, ignoredQuery, builder) -> builder.equal(root.get("createdByUserId"), principal.id()),
                documentType == null ? null : (root, ignoredQuery, builder) -> builder.equal(root.get("documentType"), documentType),
                issueDateFrom == null ? null : (root, ignoredQuery, builder) -> builder.greaterThanOrEqualTo(root.get("issueDate"), issueDateFrom),
                issueDateTo == null ? null : (root, ignoredQuery, builder) -> builder.lessThanOrEqualTo(root.get("issueDate"), issueDateTo),
                contains("createdByName", principal.role() == Role.ADMIN ? normalize(createdBy) : null),
                search(normalize(query)));
        Page<DocumentRecord> records = documentRecordRepository.findAll(specification, pageable);
        return new DocumentHistoryPageResponse(records.getContent().stream().map(this::toResponse).toList(),
                records.getNumber(), records.getSize(), records.getTotalElements(), records.getTotalPages());
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Specification<DocumentRecord> contains(String property, String value) {
        return value == null ? null : (root, ignoredQuery, builder) -> builder.like(builder.lower(root.get(property)), "%" + value.toLowerCase() + "%");
    }

    private Specification<DocumentRecord> search(String value) {
        if (value == null) return null;
        return (root, ignoredQuery, builder) -> {
            String pattern = "%" + value.toLowerCase() + "%";
            return builder.or(builder.like(builder.lower(root.get("publicNumber")), pattern), builder.like(builder.lower(root.get("companyName")), pattern),
                    builder.like(builder.lower(root.get("delegateName")), pattern), builder.like(builder.lower(root.get("createdByName")), pattern));
        };
    }

    private DocumentHistoryResponse toResponse(DocumentRecord record) {
        return new DocumentHistoryResponse(record.getId(), record.getPublicNumber(), record.getDocumentType(), record.getCreatedAt(),
                record.getCreatedByName(), record.getCompanyName(), record.getDelegateName(), record.getIssueDate());
    }
}
