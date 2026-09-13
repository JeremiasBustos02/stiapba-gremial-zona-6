package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.template.entity.DocumentType;
import jakarta.validation.constraints.NotNull;

import java.util.Map;
import java.util.UUID;

public record DocumentGenerationRequest(
        @NotNull(message = "El tipo de documento es obligatorio.") DocumentType documentType,
        @NotNull(message = "La variante es obligatoria.") UUID variantId,
        Map<String, String> baseValues,
        Map<UUID, String> manualValues
) {
}
