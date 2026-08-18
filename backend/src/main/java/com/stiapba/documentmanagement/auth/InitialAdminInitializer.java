package com.stiapba.documentmanagement.auth;

import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class InitialAdminInitializer implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(InitialAdminInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String dni;
    private final String password;
    private final String name;
    private final String lastname;

    public InitialAdminInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.security.initial-admin.dni}") String dni,
            @Value("${app.security.initial-admin.password}") String password,
            @Value("${app.security.initial-admin.name}") String name,
            @Value("${app.security.initial-admin.lastname}") String lastname
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.dni = dni;
        this.password = password;
        this.name = name;
        this.lastname = lastname;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByRole(Role.ADMIN)) {
            return;
        }
        if (isBlank(dni) && isBlank(password) && isBlank(name) && isBlank(lastname)) {
            logger.warn("No se creó el ADMIN inicial porque faltan sus variables de entorno.");
            return;
        }
        if (isBlank(dni) || isBlank(password) || isBlank(name) || isBlank(lastname)) {
            throw new IllegalStateException("Las variables INITIAL_ADMIN_* deben configurarse todas o ninguna.");
        }
        if (password.length() < 10 || password.length() > 72) {
            throw new IllegalStateException("INITIAL_ADMIN_PASSWORD debe tener entre 10 y 72 caracteres.");
        }
        userRepository.save(new User(name.trim(), lastname.trim(), dni.trim(), passwordEncoder.encode(password), Role.ADMIN));
        logger.info("Se creó el ADMIN inicial configurado.");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
