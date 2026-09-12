package com.stiapba.documentmanagement.document;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public final class DocumentBulkDtos {
    private DocumentBulkDtos() {
    }

    public record BatchResponse(int requested, int successful, int failed, List<BatchItemResponse> items) {
    }

    public record BatchItemResponse(UUID delegateId, String delegateName, String status, UUID documentId, String publicNumber,
                                    String filename, String errorCode, String message) {
        public static BatchItemResponse success(UUID delegateId, String delegateName, DocumentGenerationService.GeneratedDocument document) {
            return new BatchItemResponse(delegateId, delegateName, "SUCCESS", document.recordId(), document.publicNumber(), document.filename(), null, null);
        }

        public static BatchItemResponse failure(UUID delegateId, String delegateName, String errorCode, String message) {
            return new BatchItemResponse(delegateId, delegateName, "FAILED", null, null, null, errorCode, message);
        }
    }

    public record ZipRequest(@NotEmpty(message = "Seleccioná al menos un documento.") List<UUID> documentIds) {
    }

    public record ZipArchive(byte[] content, String filename) {
    }
}
