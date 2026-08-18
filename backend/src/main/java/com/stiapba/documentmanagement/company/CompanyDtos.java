package com.stiapba.documentmanagement.company;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class CompanyDtos {
    private CompanyDtos() {
    }

    public record CompanyRequest(
            @NotBlank(message = "El nombre es obligatorio.")
            @Size(max = 200, message = "El nombre es demasiado largo.") String nombre
    ) {
    }

    public record CompanyResponse(UUID id, String nombre, boolean active, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }
}
