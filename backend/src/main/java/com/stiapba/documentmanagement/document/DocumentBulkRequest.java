package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.template.entity.DocumentType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record DocumentBulkRequest(
        @NotNull(message = "El tipo de documento es obligatorio.") DocumentType documentType,
        @NotNull(message = "La variante es obligatoria.") UUID variantId,
        Map<String, String> baseValues,
        Map<UUID, String> manualValues,
        @NotEmpty(message = "Seleccioná al menos un delegado.")
        @Size(max = 100, message = "Podés generar hasta 100 documentos por vez.")
        List<@NotNull(message = "El delegado es obligatorio.") UUID> delegateIds
) {
}
