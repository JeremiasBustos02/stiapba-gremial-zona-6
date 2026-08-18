package com.stiapba.documentmanagement.security;

import com.stiapba.documentmanagement.user.entity.Role;

import java.util.UUID;

public record UserPrincipal(UUID id, Role role, boolean firstLogin) {
}
