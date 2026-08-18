package com.stiapba.documentmanagement.user;

import com.stiapba.documentmanagement.user.UserDtos.CreateUserRequest;
import com.stiapba.documentmanagement.user.UserDtos.CreateUserResponse;
import com.stiapba.documentmanagement.user.UserDtos.DelegateResponse;
import com.stiapba.documentmanagement.user.UserDtos.ResetPasswordResponse;
import com.stiapba.documentmanagement.user.UserDtos.UpdateUserRequest;
import com.stiapba.documentmanagement.user.UserDtos.UserPageResponse;
import com.stiapba.documentmanagement.user.UserDtos.UserResponse;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.UUID;
import java.util.List;
import com.stiapba.documentmanagement.user.entity.Role;

@Service
public class UserService {

    private static final String TEMPORARY_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final int TEMPORARY_PASSWORD_LENGTH = 16;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public CreateUserResponse create(CreateUserRequest request) {
        String dni = normalizeDni(request.dni());
        ensureDniAvailable(dni);
        String temporaryPassword = generateTemporaryPassword();
        User user = userRepository.save(new User(
                request.nombre().trim(),
                request.apellido().trim(),
                dni,
                passwordEncoder.encode(temporaryPassword),
                request.role()
        ));
        return new CreateUserResponse(user.getId(), user.getNombre(), user.getApellido(), user.getDni(), user.getRole(),
                user.isActive(), user.isFirstLogin(), temporaryPassword);
    }

    @Transactional
    public UserResponse update(UUID id, UpdateUserRequest request) {
        User user = findById(id);
        user.updateProfile(request.nombre().trim(), request.apellido().trim(), request.role());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void activate(UUID id) {
        User user = findById(id);
        user.activate();
    }

    @Transactional
    public void deactivate(UUID id) {
        User user = findById(id);
        user.deactivate();
    }

    @Transactional
    public ResetPasswordResponse resetPassword(UUID id) {
        User user = findById(id);
        String temporaryPassword = generateTemporaryPassword();
        user.changePassword(passwordEncoder.encode(temporaryPassword));
        user.requireFirstLogin();
        return new ResetPasswordResponse(temporaryPassword);
    }

    @Transactional
    public UserPageResponse list(int page, int size, String search, Boolean active, com.stiapba.documentmanagement.user.entity.Role role) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("apellido").ascending().and(Sort.by("nombre").ascending()));
        Specification<User> specification = (root, query, builder) -> builder.conjunction();
        if (search != null && !search.isBlank()) {
            String value = search.trim().toLowerCase();
            specification = specification.and((root, query, builder) -> builder.or(
                    builder.like(builder.lower(root.get("nombre")), "%" + value + "%"),
                    builder.like(builder.lower(root.get("apellido")), "%" + value + "%"),
                    builder.like(builder.lower(root.get("dni")), "%" + value + "%")));
        }
        if (active != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("active"), active));
        }
        if (role != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("role"), role));
        }
        Page<User> users = userRepository.findAll(specification, pageable);
        return new UserPageResponse(users.getContent().stream().map(this::toResponse).toList(),
                users.getNumber(), users.getSize(), users.getTotalElements(), users.getTotalPages());
    }

    public UserResponse get(UUID id) {
        return toResponse(findById(id));
    }

    public List<DelegateResponse> listActiveDelegates() {
        return userRepository.findByRoleAndActiveTrueOrderByApellidoAscNombreAsc(Role.DELEGADO).stream()
                .map(user -> new DelegateResponse(user.getId(), user.getNombre(), user.getApellido(), user.getDni()))
                .toList();
    }

    private User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new UserException(404, "USER_NOT_FOUND", "No encontramos el usuario solicitado."));
    }

    private void ensureDniAvailable(String dni) {
        if (userRepository.findByDni(dni).isPresent()) {
            throw new UserException(409, "DNI_ALREADY_EXISTS", "Ya existe un usuario registrado con ese DNI.");
        }
    }

    private String normalizeDni(String dni) {
        return dni.trim();
    }

    private String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(TEMPORARY_PASSWORD_LENGTH);
        for (int index = 0; index < TEMPORARY_PASSWORD_LENGTH; index++) {
            password.append(TEMPORARY_PASSWORD_ALPHABET.charAt(
                    secureRandom.nextInt(TEMPORARY_PASSWORD_ALPHABET.length())));
        }
        return password.toString();
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getNombre(), user.getApellido(), user.getDni(), user.getRole(),
                user.isActive(), user.isFirstLogin(), user.getCreatedAt(), user.getUpdatedAt());
    }
}
