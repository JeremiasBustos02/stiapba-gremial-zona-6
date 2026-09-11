package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.template.entity.DocumentType;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public final class DocumentHistoryDtos {
    private DocumentHistoryDtos() {
    }

    public record DocumentHistoryResponse(UUID id, String publicNumber, DocumentType documentType, OffsetDateTime createdAt,
                                          String createdBy, String companyName, String delegateName, LocalDate issueDate) {
    }

    public record DocumentHistoryPageResponse(List<DocumentHistoryResponse> content, int page, int size,
                                              long totalElements, int totalPages) {
    }

    public record SendDocumentEmailRequest(
            @NotEmpty(message = "Ingresá al menos un destinatario.")
            @Size(max = 50, message = "Podés ingresar hasta 50 destinatarios.")
            List<@NotBlank(message = "El destinatario no puede estar vacío.")
                    @Email(message = "Ingresá correos electrónicos válidos.") String> recipients,
            @NotBlank(message = "El asunto es obligatorio.")
            @Size(max = 200, message = "El asunto no puede superar los 200 caracteres.") String subject,
            @Size(max = 5000, message = "El mensaje no puede superar los 5000 caracteres.") String message) {
    }

    public record SendDocumentEmailResponse(String message) {
    }
}
