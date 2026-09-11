package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.template.entity.DocumentType;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class DashboardDtos {
    private DashboardDtos() {
    }

    public record DashboardResponse(long documentsThisMonth, long totalDocuments,
                                    DashboardDocumentResponse latestDocument,
                                    List<DashboardDocumentResponse> recentActivity) {
    }

    public record DashboardDocumentResponse(UUID id, String publicNumber, DocumentType documentType,
                                            OffsetDateTime createdAt, String createdBy, String companyName,
                                            String delegateName, LocalDate issueDate) {
    }
}
