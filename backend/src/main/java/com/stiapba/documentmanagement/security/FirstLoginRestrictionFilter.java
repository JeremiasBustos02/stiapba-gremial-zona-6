package com.stiapba.documentmanagement.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stiapba.documentmanagement.common.api.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Set;

@Component
public class FirstLoginRestrictionFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_PATHS = Set.of(
            "/api/v1/health",
            "/api/v1/auth/me",
            "/api/v1/auth/csrf",
            "/api/v1/auth/first-login/change-password",
            "/api/v1/auth/logout"
    );

    private final ObjectMapper objectMapper;

    public FirstLoginRestrictionFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!"OPTIONS".equals(request.getMethod())
                && authentication != null
                && authentication.getPrincipal() instanceof UserPrincipal principal
                && principal.firstLogin()
                && !ALLOWED_PATHS.contains(request.getRequestURI())) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(), new ApiError(
                    403,
                    "FIRST_LOGIN_REQUIRED",
                    "Debés cambiar la contraseña temporal antes de continuar.",
                    null,
                    OffsetDateTime.now()
            ));
            return;
        }
        filterChain.doFilter(request, response);
    }
}
