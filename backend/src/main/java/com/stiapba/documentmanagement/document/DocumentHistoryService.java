package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.document.DocumentHistoryDtos.DocumentHistoryPageResponse;
import com.stiapba.documentmanagement.document.DocumentHistoryDtos.DocumentHistoryResponse;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.user.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class DocumentHistoryService {
    private final DocumentRecordRepository documentRecordRepository;

    public DocumentHistoryService(DocumentRecordRepository documentRecordRepository) {
        this.documentRecordRepository = documentRecordRepository;
    }

    public DocumentHistoryPageResponse list(UserPrincipal principal, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new DocumentException(400, "INVALID_PAGINATION", "Los parámetros de paginación no son válidos.");
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<DocumentRecord> records = principal.role() == Role.ADMIN
                ? documentRecordRepository.findAll(pageable)
                : documentRecordRepository.findByCreatedByUserId(principal.id(), pageable);
        return new DocumentHistoryPageResponse(records.getContent().stream().map(this::toResponse).toList(),
                records.getNumber(), records.getSize(), records.getTotalElements(), records.getTotalPages());
    }

    private DocumentHistoryResponse toResponse(DocumentRecord record) {
        return new DocumentHistoryResponse(record.getId(), record.getPublicNumber(), record.getDocumentType(), record.getCreatedAt(),
                record.getCreatedByName(), record.getCompanyName(), record.getDelegateName(), record.getIssueDate());
    }
}
