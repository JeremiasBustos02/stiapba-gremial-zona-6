package com.stiapba.documentmanagement.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FirstLoginPasswordChangeRequest(
        @NotBlank(message = "La nueva contraseña es obligatoria.")
        @Size(min = 10, max = 72, message = "La nueva contraseña debe tener entre 10 y 72 caracteres.") String newPassword,
        @NotBlank(message = "La confirmación de contraseña es obligatoria.") String confirmPassword
) {
}
