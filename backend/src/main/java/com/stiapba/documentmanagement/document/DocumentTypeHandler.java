package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;

import java.util.List;
import java.util.UUID;

public interface DocumentTypeHandler {
    DocumentType documentType();

    DocumentGenerationService.GeneratedDocument generate(DocumentGenerationRequest request, UserPrincipal principal);

    DocumentGenerationService.GeneratedDocument regenerate(DocumentRecord record);

    List<DocumentGenerationService.ManualFieldResponse> manualFields(UUID variantId);

    List<DocumentGenerationService.GenerationFieldResponse> generationFields(UUID variantId);
}
