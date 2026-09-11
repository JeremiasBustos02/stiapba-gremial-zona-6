package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.document.DashboardDtos.DashboardDocumentResponse;
import com.stiapba.documentmanagement.document.DashboardDtos.DashboardResponse;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.user.entity.Role;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class DashboardService {
    private final DocumentRecordRepository documentRecordRepository;

    public DashboardService(DocumentRecordRepository documentRecordRepository) {
        this.documentRecordRepository = documentRecordRepository;
    }

    public DashboardResponse getDashboard(UserPrincipal principal) {
        boolean admin = principal.role() == Role.ADMIN;
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime monthStart = now.withDayOfMonth(1).toLocalDate().atStartOfDay().atOffset(now.getOffset());
        long documentsThisMonth = admin
                ? documentRecordRepository.countByCreatedAtGreaterThanEqual(monthStart)
                : documentRecordRepository.countByCreatedByUserIdAndCreatedAtGreaterThanEqual(principal.id(), monthStart);
        long totalDocuments = admin
                ? documentRecordRepository.count()
                : documentRecordRepository.countByCreatedByUserId(principal.id());
        List<DocumentRecord> recent = admin
                ? documentRecordRepository.findTop5ByOrderByCreatedAtDesc()
                : documentRecordRepository.findTop5ByCreatedByUserIdOrderByCreatedAtDesc(principal.id());
        DashboardDocumentResponse latest = recent.isEmpty() ? null : toResponse(recent.get(0));
        return new DashboardResponse(documentsThisMonth, totalDocuments, latest, recent.stream().map(this::toResponse).toList());
    }

    private DashboardDocumentResponse toResponse(DocumentRecord record) {
        return new DashboardDocumentResponse(record.getId(), record.getPublicNumber(), record.getDocumentType(),
                record.getCreatedAt(), record.getCreatedByName(), record.getCompanyName(), record.getDelegateName(), record.getIssueDate());
    }
}
