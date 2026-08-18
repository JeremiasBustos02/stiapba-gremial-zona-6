package com.stiapba.documentmanagement.user;

import com.stiapba.documentmanagement.user.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class UserDtos {

    private UserDtos() {
    }

    public record CreateUserRequest(
            @NotBlank(message = "El nombre es obligatorio.") @Size(max = 100, message = "El nombre es demasiado largo.") String nombre,
            @NotBlank(message = "El apellido es obligatorio.") @Size(max = 100, message = "El apellido es demasiado largo.") String apellido,
            @NotBlank(message = "El DNI es obligatorio.") @Size(max = 20, message = "El DNI es demasiado largo.")
            @Pattern(regexp = "^[0-9]+$", message = "El DNI solo puede contener números.") String dni,
            @NotNull(message = "El rol es obligatorio.") Role role
    ) {
    }

    public record UpdateUserRequest(
            @NotBlank(message = "El nombre es obligatorio.") @Size(max = 100, message = "El nombre es demasiado largo.") String nombre,
            @NotBlank(message = "El apellido es obligatorio.") @Size(max = 100, message = "El apellido es demasiado largo.") String apellido,
            @NotNull(message = "El rol es obligatorio.") Role role
    ) {
    }

    public record UserResponse(
            UUID id,
            String nombre,
            String apellido,
            String dni,
            Role role,
            boolean active,
            boolean firstLogin,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    public record UserPageResponse(
            java.util.List<UserResponse> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    public record CreateUserResponse(
            UUID id,
            String nombre,
            String apellido,
            String dni,
            Role role,
            boolean active,
            boolean firstLogin,
            String temporaryPassword
    ) {
    }

    public record ResetPasswordResponse(
            String temporaryPassword
    ) {
    }
}
