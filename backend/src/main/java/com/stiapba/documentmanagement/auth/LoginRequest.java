package com.stiapba.documentmanagement.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "El DNI es obligatorio.") @Size(max = 20, message = "El DNI es inválido.") String dni,
        @NotBlank(message = "La contraseña es obligatoria.") String password
) {
}
