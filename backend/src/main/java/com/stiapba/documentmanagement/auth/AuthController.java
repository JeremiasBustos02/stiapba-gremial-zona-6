package com.stiapba.documentmanagement.auth;

import com.stiapba.documentmanagement.security.JwtAuthenticationFilter;
import com.stiapba.documentmanagement.security.JwtService;
import com.stiapba.documentmanagement.security.SpaCsrfTokenRequestHandler;
import com.stiapba.documentmanagement.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;
    private final JwtService jwtService;
    private final boolean secureCookies;
    private final String sameSite;

    public AuthController(
            AuthService authService,
            JwtService jwtService,
            @Value("${app.security.cookie.secure}") boolean secureCookies,
            @Value("${app.security.cookie.same-site}") String sameSite
    ) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.secureCookies = secureCookies;
        this.sameSite = sameSite;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.LoginResult result = authService.login(request);
        logger.info("AUTH_TOKEN issued path=/ secure={} sameSite={} maxAgeSeconds={} domain=host-only",
                secureCookies, sameSite, jwtService.expiration().toSeconds());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookie(result.token(), jwtService.expiration().toSeconds()).toString())
                .body(new LoginResponse(result.user()));
    }

    @GetMapping("/me")
    public AuthenticatedUserResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.me(principal);
    }

    @GetMapping("/csrf")
    public CsrfTokenResponse csrf(
            @RequestAttribute(SpaCsrfTokenRequestHandler.RAW_CSRF_TOKEN_ATTRIBUTE) CsrfToken csrfToken
    ) {
        return new CsrfTokenResponse(csrfToken.getToken());
    }

    @PostMapping("/first-login/change-password")
    public ResponseEntity<MessageResponse> changeFirstLoginPassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody FirstLoginPasswordChangeRequest request
    ) {
        String token = authService.changeFirstLoginPassword(principal, request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookie(token, jwtService.expiration().toSeconds()).toString())
                .body(new MessageResponse("Contraseña actualizada correctamente."));
    }

    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        String token = authService.changePassword(principal, request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookie(token, jwtService.expiration().toSeconds()).toString())
                .body(new MessageResponse("Contraseña actualizada correctamente."));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UserPrincipal principal) {
        authService.logout(principal);
        ResponseCookie csrfCookie = ResponseCookie.from("XSRF-TOKEN", "")
                .path("/")
                .httpOnly(false)
                .secure(secureCookies)
                .sameSite(sameSite)
                .maxAge(0)
                .build();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, authCookie("", 0).toString())
                .header(HttpHeaders.SET_COOKIE, csrfCookie.toString())
                .build();
    }

    private ResponseCookie authCookie(String value, long maxAge) {
        return ResponseCookie.from(JwtAuthenticationFilter.AUTH_COOKIE, value)
                .path("/")
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite(sameSite)
                .maxAge(maxAge)
                .build();
    }
}
