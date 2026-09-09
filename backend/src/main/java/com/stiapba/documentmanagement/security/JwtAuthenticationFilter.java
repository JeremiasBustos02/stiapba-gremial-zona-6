package com.stiapba.documentmanagement.security;

import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String AUTH_COOKIE = "AUTH_TOKEN";
    private static final String HEALTH_PATH = "/api/v1/health";
    private static final String LOGIN_PATH = "/api/v1/auth/login";
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "GET".equals(request.getMethod()) && HEALTH_PATH.equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        boolean authCookiePresent = hasAuthCookie(request);
        Optional<String> token = findToken(request);
        JwtValidation validation = token.map(this::authenticate).orElse(JwtValidation.ABSENT);
        filterChain.doFilter(request, response);
        if (shouldLogAuthentication(request)) {
            logger.info("JWT authentication request method={} path={} authCookiePresent={} jwtValidation={} responseStatus={}",
                    request.getMethod(), request.getRequestURI(), authCookiePresent, validation.value, response.getStatus());
        }
    }

    private JwtValidation authenticate(String token) {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            return JwtValidation.VALID;
        }
        try {
            JwtService.TokenClaims claims = jwtService.parseToken(token);
            Optional<User> user = userRepository.findById(claims.userId())
                    .filter(value -> value.isActive() && value.getSessionVersion() == claims.sessionVersion());
            if (user.isEmpty()) {
                return JwtValidation.SESSION_INVALID;
            }
            setAuthentication(user.get());
            return JwtValidation.VALID;
        } catch (ExpiredJwtException ignored) {
            SecurityContextHolder.clearContext();
            return JwtValidation.EXPIRED;
        } catch (JwtException | IllegalArgumentException ignored) {
            SecurityContextHolder.clearContext();
            return JwtValidation.INVALID;
        }
    }

    private boolean shouldLogAuthentication(HttpServletRequest request) {
        return !"OPTIONS".equals(request.getMethod())
                && !LOGIN_PATH.equals(request.getRequestURI())
                && request.getRequestURI().startsWith("/api/v1/");
    }

    private void setAuthentication(User user) {
        UserPrincipal principal = new UserPrincipal(user.getId(), user.getRole(), user.isFirstLogin());
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private Optional<String> findToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        for (Cookie cookie : cookies) {
            if (AUTH_COOKIE.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return Optional.of(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    private boolean hasAuthCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return false;
        }
        for (Cookie cookie : cookies) {
            if (AUTH_COOKIE.equals(cookie.getName())) {
                return true;
            }
        }
        return false;
    }

    private enum JwtValidation {
        VALID("valid"),
        EXPIRED("expired"),
        INVALID("invalid"),
        ABSENT("absent"),
        SESSION_INVALID("session-invalid");

        private final String value;

        JwtValidation(String value) {
            this.value = value;
        }
    }
}
