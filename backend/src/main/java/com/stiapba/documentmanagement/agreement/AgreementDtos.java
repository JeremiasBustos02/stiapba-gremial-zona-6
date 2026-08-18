package com.stiapba.documentmanagement.agreement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class AgreementDtos {
    private AgreementDtos() {
    }

    public record AgreementRequest(
            @Size(max = 50, message = "El código es demasiado largo.") String codigo,
            @NotBlank(message = "La descripción es obligatoria.")
            @Size(max = 500, message = "La descripción es demasiado larga.") String descripcion
    ) {
    }

    public record AgreementResponse(UUID id, String codigo, String descripcion, boolean active,
                                    OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }
}
