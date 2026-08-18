package com.stiapba.documentmanagement.auth;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.stiapba.documentmanagement.user.entity.Role;

import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthenticatedUserResponse(
        UUID id,
        String nombre,
        String apellido,
        String dni,
        Role role,
        Boolean active,
        boolean firstLogin
) {
}
