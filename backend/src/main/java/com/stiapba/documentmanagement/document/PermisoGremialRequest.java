package com.stiapba.documentmanagement.document;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.time.LocalDate;
import java.util.UUID;
import java.util.Map;

public record PermisoGremialRequest(
        @NotNull(message = "La provincia es obligatoria.") UUID provinceId,
        @NotNull(message = "La fecha de emisión es obligatoria.")
        @PastOrPresent(message = "La fecha de emisión no puede ser futura.") LocalDate issueDate,
        @NotNull(message = "La empresa es obligatoria.") UUID companyId,
        @NotNull(message = "El delegado es obligatorio.") UUID delegateId,
        @NotNull(message = "El día de permiso es obligatorio.") @Min(value = 1, message = "El día de permiso debe estar entre 1 y 31.")
        @Max(value = 31, message = "El día de permiso debe estar entre 1 y 31.") Integer permitDay,
        @NotNull(message = "El convenio es obligatorio.") UUID agreementId,
        @NotNull(message = "La variante es obligatoria.") UUID variantId,
        Map<UUID, String> manualValues
) {
    public PermisoGremialRequest(UUID provinceId, LocalDate issueDate, UUID companyId, UUID delegateId, Integer permitDay,
                                 UUID agreementId, UUID variantId) {
        this(provinceId, issueDate, companyId, delegateId, permitDay, agreementId, variantId, Map.of());
    }
}
