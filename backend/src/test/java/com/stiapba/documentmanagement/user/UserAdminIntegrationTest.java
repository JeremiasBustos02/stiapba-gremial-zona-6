package com.stiapba.documentmanagement.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stiapba.documentmanagement.security.JwtAuthenticationFilter;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
@TestPropertySource(properties = {
        "app.security.jwt.secret=dGVzdC1qd3Qtc2VjcmV0LW11c3QtYmUtYXQtbGVhc3QtMzItYnl0ZXMtbG9uZw==",
        "app.security.jwt.expiration-seconds=3600",
        "app.security.initial-admin.dni=",
        "app.security.initial-admin.password=",
        "app.security.initial-admin.name=",
        "app.security.initial-admin.lastname="
})
class UserAdminIntegrationTest {

    private static final String ADMIN_PASSWORD = "admin-password";
    private static final String DELEGATE_PASSWORD = "delegate-password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void isolateUsers() {
        userRepository.deleteAll();
        userRepository.flush();
    }

    @Test
    void allowsAdminToListGetCreateEditAndManageState() throws Exception {
        User admin = saveUser("30000001", Role.ADMIN, ADMIN_PASSWORD);
        MockMvcSession session = authenticate(admin.getDni(), ADMIN_PASSWORD);

        mockMvc.perform(get("/api/v1/users").cookie(session.authCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        MvcResult created = mockMvc.perform(post("/api/v1/users")
                        .cookie(session.authCookie(), session.csrfCookie())
                        .header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Juan","apellido":"Pérez","dni":"40123456","role":"DELEGADO"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.temporaryPassword").isString())
                .andExpect(jsonPath("$.firstLogin").value(true))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();
        String createdId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/v1/users/{id}", createdId).cookie(session.authCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dni").value("40123456"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        mockMvc.perform(put("/api/v1/users/{id}", createdId)
                        .cookie(session.authCookie(), session.csrfCookie())
                        .header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Juan Carlos","apellido":"Pérez","role":"ADMIN"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Juan Carlos"))
                .andExpect(jsonPath("$.dni").value("40123456"))
                .andExpect(jsonPath("$.role").value("ADMIN"));

        mockMvc.perform(patch("/api/v1/users/{id}/deactivate", createdId)
                        .cookie(session.authCookie(), session.csrfCookie())
                        .header("X-XSRF-TOKEN", session.csrfToken()))
                .andExpect(status().isNoContent());
        assertThat(userRepository.findById(UUID.fromString(createdId)).orElseThrow().isActive()).isFalse();

        mockMvc.perform(patch("/api/v1/users/{id}/activate", createdId)
                        .cookie(session.authCookie(), session.csrfCookie())
                        .header("X-XSRF-TOKEN", session.csrfToken()))
                .andExpect(status().isNoContent());
        assertThat(userRepository.findById(UUID.fromString(createdId)).orElseThrow().isActive()).isTrue();
    }

    @Test
    void rejectsDelegateAccessToEveryUserOperation() throws Exception {
        User delegate = saveUser("30000002", Role.DELEGADO, DELEGATE_PASSWORD);
        MockMvcSession session = authenticate(delegate.getDni(), DELEGATE_PASSWORD);

        mockMvc.perform(get("/api/v1/users").cookie(session.authCookie()))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/users")
                        .cookie(session.authCookie(), session.csrfCookie())
                        .header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsDuplicateDniAndDoesNotExposeTemporaryPasswordLater() throws Exception {
        User admin = saveUser("30000003", Role.ADMIN, ADMIN_PASSWORD);
        MockMvcSession session = authenticate(admin.getDni(), ADMIN_PASSWORD);
        String request = """
                {"nombre":"Ana","apellido":"Gómez","dni":"40123457","role":"DELEGADO"}
                """;

        MvcResult created = mockMvc.perform(post("/api/v1/users")
                        .cookie(session.authCookie(), session.csrfCookie())
                        .header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andReturn();
        String temporaryPassword = objectMapper.readTree(created.getResponse().getContentAsString()).get("temporaryPassword").asText();

        mockMvc.perform(post("/api/v1/users")
                        .cookie(session.authCookie(), session.csrfCookie())
                        .header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DNI_ALREADY_EXISTS"));
        User createdUser = userRepository.findByDni("40123457").orElseThrow();
        assertThat(createdUser.getPasswordHash()).doesNotContain(temporaryPassword);
        assertThat(createdUser.isFirstLogin()).isTrue();
    }

    @Test
    void resetsPasswordOnlyOnceAndRequiresFirstLoginAgain() throws Exception {
        User admin = saveUser("30000004", Role.ADMIN, ADMIN_PASSWORD);
        User delegate = saveUser("40123458", Role.DELEGADO, DELEGATE_PASSWORD);
        delegate.completeFirstLogin();
        userRepository.saveAndFlush(delegate);
        MockMvcSession session = authenticate(admin.getDni(), ADMIN_PASSWORD);

        MvcResult reset = mockMvc.perform(post("/api/v1/users/{id}/reset-password", delegate.getId())
                        .cookie(session.authCookie(), session.csrfCookie())
                        .header("X-XSRF-TOKEN", session.csrfToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temporaryPassword").isString())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();
        String temporaryPassword = objectMapper.readTree(reset.getResponse().getContentAsString()).get("temporaryPassword").asText();
        User updated = userRepository.findById(delegate.getId()).orElseThrow();
        assertThat(updated.isFirstLogin()).isTrue();
        assertThat(passwordEncoder.matches(temporaryPassword, updated.getPasswordHash())).isTrue();

        mockMvc.perform(get("/api/v1/users/{id}", delegate.getId()).cookie(session.authCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temporaryPassword").doesNotExist());
    }

    @Test
    void deactivatedUserCannotAuthenticate() throws Exception {
        User admin = saveUser("30000005", Role.ADMIN, ADMIN_PASSWORD);
        User delegate = saveUser("40123459", Role.DELEGADO, DELEGATE_PASSWORD);
        MockMvcSession session = authenticate(admin.getDni(), ADMIN_PASSWORD);

        mockMvc.perform(patch("/api/v1/users/{id}/deactivate", delegate.getId())
                        .cookie(session.authCookie(), session.csrfCookie())
                        .header("X-XSRF-TOKEN", session.csrfToken()))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dni\":\"40123459\",\"password\":\"delegate-password\"}"))
                .andExpect(status().isUnauthorized());
    }

    private User saveUser(String dni, Role role, String password) {
        User user = new User("Test", "User", dni, passwordEncoder.encode(password), role);
        if (role == Role.ADMIN) user.completeFirstLogin();
        return userRepository.saveAndFlush(user);
    }

    private MockMvcSession authenticate(String dni, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dni\":\"" + dni + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        MockCookie auth = new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE,
                result.getResponse().getCookie(JwtAuthenticationFilter.AUTH_COOKIE).getValue());
        MockCookie csrf = new MockCookie("XSRF-TOKEN", result.getResponse().getCookie("XSRF-TOKEN").getValue());
        return new MockMvcSession(auth, csrf);
    }

    private record MockMvcSession(MockCookie authCookie, MockCookie csrfCookie) {
        String csrfToken() {
            return csrfCookie.getValue();
        }
    }
}
