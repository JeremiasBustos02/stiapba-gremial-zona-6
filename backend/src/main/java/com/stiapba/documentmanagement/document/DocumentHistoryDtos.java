package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.template.entity.DocumentType;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public final class DocumentHistoryDtos {
    private DocumentHistoryDtos() {
    }

    public record DocumentHistoryResponse(UUID id, String publicNumber, DocumentType documentType, OffsetDateTime createdAt,
                                          String createdBy, String companyName, String delegateName, LocalDate issueDate) {
    }

    public record DocumentHistoryPageResponse(List<DocumentHistoryResponse> content, int page, int size,
                                              long totalElements, int totalPages) {
    }

    public record SendDocumentEmailRequest(@NotBlank(message = "El correo electrónico es obligatorio.")
                                           @Email(message = "Ingresá un correo electrónico válido.") String recipient) {
    }

    public record SendDocumentEmailResponse(String message) {
    }
}
