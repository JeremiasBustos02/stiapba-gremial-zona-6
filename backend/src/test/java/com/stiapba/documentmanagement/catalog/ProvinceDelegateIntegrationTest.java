package com.stiapba.documentmanagement.catalog;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = {
        "app.security.jwt.secret=dGVzdC1qd3Qtc2VjcmV0LW11c3QtYmUtYXQtbGVhc3QtMzItYnl0ZXMtbG9uZw==",
        "app.security.jwt.expiration-seconds=3600",
        "app.security.initial-admin.dni=",
        "app.security.initial-admin.password=",
        "app.security.initial-admin.name=",
        "app.security.initial-admin.lastname=",
        "app.template.seed-enabled=false"
})
class ProvinceDelegateIntegrationTest {
    private static final String PASSWORD = "delegate-password";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void cleanUsers() {
        userRepository.deleteAll();
        userRepository.flush();
    }

    @Test
    void authenticatedUsersCanReadTheSeededProvinceCatalog() throws Exception {
        User user = saveUser("30000401", Role.DELEGADO);
        MockCookie authCookie = authenticate(user.getDni());

        mockMvc.perform(get("/api/v1/provinces").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(23))
                .andExpect(jsonPath("$[0].name").value("Buenos Aires"));
    }

    @Test
    void onlyActiveDelegateUsersAreAvailableForSelection() throws Exception {
        User requestingUser = saveUser("30000402", Role.DELEGADO);
        saveUser("30000403", Role.DELEGADO);
        User inactiveDelegate = saveUser("30000404", Role.DELEGADO);
        inactiveDelegate.deactivate();
        userRepository.saveAndFlush(inactiveDelegate);
        saveUser("30000405", Role.ADMIN);

        mockMvc.perform(get("/api/v1/delegates").cookie(authenticate(requestingUser.getDni())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.dni == '30000403')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.dni == '30000402')]").isNotEmpty());
    }

    @Test
    void provinceAndDelegateCatalogsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/provinces")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/delegates")).andExpect(status().isUnauthorized());
    }

    private User saveUser(String dni, Role role) {
        User user = new User("Test", "User", dni, passwordEncoder.encode(PASSWORD), role);
        user.completeFirstLogin();
        return userRepository.saveAndFlush(user);
    }

    private MockCookie authenticate(String dni) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dni\":\"" + dni + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE,
                result.getResponse().getCookie(JwtAuthenticationFilter.AUTH_COOKIE).getValue());
    }
}
