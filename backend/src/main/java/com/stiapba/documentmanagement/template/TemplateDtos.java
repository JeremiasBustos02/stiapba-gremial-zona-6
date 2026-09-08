package com.stiapba.documentmanagement.template;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.stiapba.documentmanagement.template.entity.DocumentType;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class TemplateDtos {
    private TemplateDtos() {
    }

    public record TemplateRequest(
            @NotBlank(message = "El nombre es obligatorio.")
            @Size(max = 200, message = "El nombre es demasiado largo.") String nombre,
            @NotBlank(message = "La descripción es obligatoria.")
            @Size(max = 500, message = "La descripción es demasiado larga.") String descripcion,
            DocumentType documentType
    ) {
    }

    public record TemplateResponse(UUID id, String nombre, String descripcion, DocumentType documentType, boolean active,
                                   OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }

    public record TemplateVariantResponse(UUID id, UUID templateId, String nombre, boolean active, boolean legacyPositioned,
                                          OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }
}
