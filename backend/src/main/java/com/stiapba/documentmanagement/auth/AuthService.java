package com.stiapba.documentmanagement.auth;

import com.stiapba.documentmanagement.security.JwtService;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResult login(LoginRequest request) {
        User user = userRepository.findByDni(request.dni()).orElseThrow(this::invalidCredentials);
        if (!user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return new LoginResult(jwtService.createToken(user.getId(), user.getSessionVersion()), toResponse(user, false));
    }

    @Transactional
    public void changeFirstLoginPassword(UserPrincipal principal, FirstLoginPasswordChangeRequest request) {
        User user = requireActiveUser(principal);
        if (!user.isFirstLogin()) {
            throw new AuthException(403, "FIRST_LOGIN_NOT_REQUIRED", "El cambio obligatorio de contraseña no está disponible.");
        }
        validatePasswordConfirmation(request.newPassword(), request.confirmPassword());
        user.changePassword(passwordEncoder.encode(request.newPassword()));
        user.completeFirstLogin();
    }

    @Transactional
    public void changePassword(UserPrincipal principal, ChangePasswordRequest request) {
        User user = requireActiveUser(principal);
        if (user.isFirstLogin()) {
            throw new AuthException(403, "FIRST_LOGIN_REQUIRED", "Debés cambiar la contraseña temporal antes de continuar.");
        }
        updatePassword(user, request, true);
    }

    public AuthenticatedUserResponse me(UserPrincipal principal) {
        User user = requireActiveUser(principal);
        return toResponse(user, true);
    }

    @Transactional
    public void logout(UserPrincipal principal) {
        User user = requireActiveUser(principal);
        user.invalidateSessions();
    }

    private void updatePassword(User user, ChangePasswordRequest request, boolean rejectCurrentPassword) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new AuthException(400, "CURRENT_PASSWORD_INVALID", "La contraseña actual no es correcta.",
                    Map.of("currentPassword", "La contraseña actual no es correcta."));
        }
        validatePasswordConfirmation(request.newPassword(), request.confirmPassword());
        if (rejectCurrentPassword && passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new AuthException(400, "PASSWORD_MUST_DIFFER", "La nueva contraseña debe ser distinta de la actual.",
                    Map.of("newPassword", "La nueva contraseña debe ser distinta de la actual."));
        }
        user.changePassword(passwordEncoder.encode(request.newPassword()));
    }

    private void validatePasswordConfirmation(String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new AuthException(400, "PASSWORD_CONFIRMATION_MISMATCH", "Las contraseñas no coinciden.",
                    Map.of("confirmPassword", "Las contraseñas no coinciden."));
        }
    }

    private User requireActiveUser(UserPrincipal principal) {
        return userRepository.findById(principal.id())
                .filter(User::isActive)
                .orElseThrow(() -> new AuthException(401, "SESSION_INVALID", "La sesión no es válida o expiró."));
    }

    private AuthenticatedUserResponse toResponse(User user, boolean includeActive) {
        return new AuthenticatedUserResponse(user.getId(), user.getNombre(), user.getApellido(), user.getDni(),
                user.getRole(), includeActive ? user.isActive() : null, user.isFirstLogin());
    }

    private AuthException invalidCredentials() {
        return new AuthException(401, "INVALID_CREDENTIALS", "No pudimos iniciar sesión. Verificá tus datos e intentá nuevamente.");
    }

    public record LoginResult(String token, AuthenticatedUserResponse user) {
    }
}
