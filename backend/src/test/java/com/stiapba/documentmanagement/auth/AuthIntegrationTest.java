package com.stiapba.documentmanagement.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stiapba.documentmanagement.security.JwtAuthenticationFilter;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
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
        "app.security.initial-admin.lastname=",
        "frontend.url=https://documentos.example.vercel.app"
})
class AuthIntegrationTest {

    private static final String PASSWORD = "contraseña-segura";
    private static final String JWT_SECRET = "dGVzdC1qd3Qtc2VjcmV0LW11c3QtYmUtYXQtbGVhc3QtMzItYnl0ZXMtbG9uZw==";

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
    void exposesHealthEndpointWithoutAuthenticationOrCsrf() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(cookie().doesNotExist("JSESSIONID"))
                .andExpect(cookie().doesNotExist(JwtAuthenticationFilter.AUTH_COOKIE))
                .andExpect(cookie().doesNotExist("XSRF-TOKEN"));
    }

    @Test
    void healthRequestWithMalformedAuthCookieDoesNotMaterializeCsrfToken() throws Exception {
        mockMvc.perform(get("/api/v1/health")
                        .cookie(new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE, "malformed-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(cookie().doesNotExist(JwtAuthenticationFilter.AUTH_COOKIE))
                .andExpect(cookie().doesNotExist("XSRF-TOKEN"));
    }

    @Test
    void exposesHeadHealthWithoutAuthenticationJwtParsingOrCookies() throws Exception {
        mockMvc.perform(head("/api/v1/health")
                        .cookie(new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE, "malformed-token")))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().string(""))
                .andExpect(cookie().doesNotExist("JSESSIONID"))
                .andExpect(cookie().doesNotExist(JwtAuthenticationFilter.AUTH_COOKIE))
                .andExpect(cookie().doesNotExist("XSRF-TOKEN"));
    }

    @Test
    void doesNotExposeOtherHealthMethods() throws Exception {
        String csrfToken = "csrf-token-for-health-test";

        mockMvc.perform(post("/api/v1/health")
                        .cookie(new MockCookie("XSRF-TOKEN", csrfToken))
                        .header("X-XSRF-TOKEN", csrfToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    @Test
    void keepsOtherApiEndpointsProtected() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logsInWithValidCredentialsAndSetsAuthAndCsrfCookies() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, false);

        MvcResult result = login(user.getDni(), PASSWORD)
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly(JwtAuthenticationFilter.AUTH_COOKIE, true))
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false))
                .andExpect(jsonPath("$.user.dni").value(user.getDni()))
                .andExpect(jsonPath("$.user.active").doesNotExist())
                .andReturn();

        assertThat(result.getResponse().getCookie(JwtAuthenticationFilter.AUTH_COOKIE)).isNotNull();
        String authSetCookie = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE).stream()
                .filter(value -> value.startsWith(JwtAuthenticationFilter.AUTH_COOKIE + "="))
                .findFirst()
                .orElseThrow();
        assertThat(authSetCookie)
                .contains("Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=3600")
                .doesNotContain("Domain=");
    }

    @Test
    void providesCsrfTokenForCrossSiteClientsAndRestrictsCorsToConfiguredFrontend() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, false);
        MockCookie authCookie = authCookie(login(user.getDni(), PASSWORD).andReturn());

        MvcResult tokenResult = mockMvc.perform(get("/api/v1/auth/csrf")
                        .cookie(authCookie)
                        .header(HttpHeaders.ORIGIN, "https://documentos.example.vercel.app"))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();

        assertThat(latestCsrfCookieValue(tokenResult))
                .isEqualTo(objectMapper.readTree(tokenResult.getResponse().getContentAsString()).get("token").asText());
        mockMvc.perform(options("/api/v1/auth/csrf")
                        .header(HttpHeaders.ORIGIN, "https://documentos.example.vercel.app")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "X-XSRF-TOKEN"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://documentos.example.vercel.app"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
        mockMvc.perform(options("/api/v1/health")
                        .header(HttpHeaders.ORIGIN, "https://documentos.example.vercel.app")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "HEAD"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"));
    }

    @Test
    void rejectsUnknownDniAndIncorrectPasswordWithTheSameGenericError() throws Exception {
        saveUser("40123456", Role.DELEGADO, false);

        login("99999999", PASSWORD)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        login("40123456", "incorrecta")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void rejectsInactiveUserLoginAndPreviouslyIssuedToken() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, false);
        MockCookie authCookie = authCookie(login(user.getDni(), PASSWORD).andReturn());
        user.deactivate();
        userRepository.saveAndFlush(user);

        login(user.getDni(), PASSWORD)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        mockMvc.perform(get("/api/v1/auth/me").cookie(authCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    @Test
    void requiresAuthenticationAndRejectsInvalidOrExpiredTokens() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, false);

        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
        mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
        mockMvc.perform(get("/api/v1/auth/me").cookie(new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE, "invalid")))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/auth/me").cookie(new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE, expiredToken(user))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsAuthenticatedUserFromValidCookie() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, false);
        MockCookie authCookie = authCookie(login(user.getDni(), PASSWORD).andReturn());

        mockMvc.perform(get("/api/v1/auth/me").cookie(authCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId().toString()))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void restrictsFirstLoginUntilMandatoryPasswordChangeAndThenAllowsAccess() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, true);
        MvcResult login = login(user.getDni(), PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.firstLogin").value(true))
                .andReturn();
        MockCookie authCookie = authCookie(login);
        MvcResult csrf = mockMvc.perform(get("/api/v1/auth/csrf")
                        .cookie(authCookie)
                        .header(HttpHeaders.ORIGIN, "https://documentos.example.vercel.app"))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();
        String csrfToken = csrfToken(csrf);
        MockCookie csrfCookie = new MockCookie("XSRF-TOKEN", latestCsrfCookieValue(csrf));

        assertThat(csrfCookieCount(csrf)).isEqualTo(1);
        assertThat(csrfCookie.getValue()).isEqualTo(csrfToken);

        mockMvc.perform(get("/api/v1/companies").cookie(authCookie))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FIRST_LOGIN_REQUIRED"));
        MvcResult passwordChange = mockMvc.perform(post("/api/v1/auth/first-login/change-password")
                        .cookie(authCookie, csrfCookie)
                        .header(HttpHeaders.ORIGIN, "https://documentos.example.vercel.app")
                        .header("X-XSRF-TOKEN", csrfToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(firstLoginPasswordChange("contraseña-nueva", "contraseña-nueva")))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly(JwtAuthenticationFilter.AUTH_COOKIE, true))
                .andReturn();
        mockMvc.perform(get("/api/v1/auth/me").cookie(authCookie))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/auth/me").cookie(authCookie(passwordChange)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstLogin").value(false));
        mockMvc.perform(get("/api/v1/companies").cookie(authCookie(passwordChange)))
                .andExpect(status().isOk());
    }

    @Test
    void rejectsFirstLoginPasswordChangeWithoutCsrfToken() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, true);
        MockCookie authCookie = authCookie(login(user.getDni(), PASSWORD).andReturn());

        mockMvc.perform(post("/api/v1/auth/first-login/change-password")
                        .cookie(authCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(firstLoginPasswordChange("contraseña-nueva", "contraseña-nueva")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void rejectsFirstLoginPasswordChangeWithMismatchedCsrfToken() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, true);
        MockCookie authCookie = authCookie(login(user.getDni(), PASSWORD).andReturn());
        MvcResult csrf = mockMvc.perform(get("/api/v1/auth/csrf").cookie(authCookie))
                .andExpect(status().isOk())
                .andReturn();
        MockCookie csrfCookie = new MockCookie("XSRF-TOKEN", latestCsrfCookieValue(csrf));

        mockMvc.perform(post("/api/v1/auth/first-login/change-password")
                        .cookie(authCookie, csrfCookie)
                        .header("X-XSRF-TOKEN", csrfToken(csrf) + "-mismatch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(firstLoginPasswordChange("contraseña-nueva", "contraseña-nueva")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void requiresAuthenticationForFirstLoginPasswordChangeAfterCsrfValidation() throws Exception {
        String csrfToken = "csrf-token-for-authentication-test";

        mockMvc.perform(post("/api/v1/auth/first-login/change-password")
                        .cookie(new MockCookie("XSRF-TOKEN", csrfToken))
                        .header("X-XSRF-TOKEN", csrfToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(firstLoginPasswordChange("contraseña-nueva", "contraseña-nueva")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
    }

    @Test
    void changesPasswordNormallyAndEnforcesPasswordRules() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, false);
        MvcResult login = login(user.getDni(), PASSWORD).andReturn();

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .cookie(authCookie(login), csrfCookie(login))
                        .header("X-XSRF-TOKEN", csrfCookie(login).getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(passwordChange(PASSWORD, "corta", "corta")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        MvcResult passwordChange = mockMvc.perform(post("/api/v1/auth/change-password")
                        .cookie(authCookie(login), csrfCookie(login))
                        .header("X-XSRF-TOKEN", csrfCookie(login).getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(passwordChange(PASSWORD, "contraseña-nueva", "contraseña-nueva")))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly(JwtAuthenticationFilter.AUTH_COOKIE, true))
                .andReturn();
        mockMvc.perform(get("/api/v1/auth/me").cookie(authCookie(login)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/auth/me").cookie(authCookie(passwordChange)))
                .andExpect(status().isOk());
        login(user.getDni(), PASSWORD).andExpect(status().isUnauthorized());
        login(user.getDni(), "contraseña-nueva").andExpect(status().isOk());
    }

    @Test
    void logoutClearsBothCookies() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, false);
        MvcResult login = login(user.getDni(), PASSWORD).andReturn();

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(authCookie(login), csrfCookie(login))
                        .header("X-XSRF-TOKEN", csrfCookie(login).getValue()))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge(JwtAuthenticationFilter.AUTH_COOKIE, 0))
                .andExpect(cookie().maxAge("XSRF-TOKEN", 0));
    }

    @Test
    void logoutOnlyClearsTheCurrentBrowserCookie() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, false);
        MvcResult login = login(user.getDni(), PASSWORD).andExpect(status().isOk()).andReturn();
        MockCookie authCookie = authCookie(login);
        MockCookie csrfCookie = csrfCookie(login);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(authCookie, csrfCookie)
                        .header("X-XSRF-TOKEN", csrfCookie.getValue()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/auth/me").cookie(authCookie))
                .andExpect(status().isOk());
    }

    @Test
    void allowsTwoActiveSessionsForTheSameAccount() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, false);
        MvcResult firstLogin = login(user.getDni(), PASSWORD).andReturn();
        MvcResult secondLogin = login(user.getDni(), PASSWORD).andReturn();

        mockMvc.perform(get("/api/v1/auth/me").cookie(authCookie(firstLogin)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/auth/me").cookie(authCookie(secondLogin)))
                .andExpect(status().isOk());
    }

    @Test
    void rejectsMalformedJsonWithConsistentClientError() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{invalid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void deniesDelegateAccessToAdminRoutes() throws Exception {
        User user = saveUser("40123456", Role.DELEGADO, false);
        MockCookie authCookie = authCookie(login(user.getDni(), PASSWORD).andReturn());

        mockMvc.perform(get("/api/v1/users").cookie(authCookie))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void provisionsInitialAdminOnlyWhenNoAdminExists() throws Exception {
        InitialAdminInitializer provisioner = new InitialAdminInitializer(
                userRepository, passwordEncoder, "30111222", "admin-temporal", "Admin", "Inicial");

        provisioner.run(new DefaultApplicationArguments(new String[0]));
        provisioner.run(new DefaultApplicationArguments(new String[0]));

        assertThat(userRepository.count()).isEqualTo(1);
        User admin = userRepository.findByDni("30111222").orElseThrow();
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.isFirstLogin()).isTrue();
        assertThat(passwordEncoder.matches("admin-temporal", admin.getPasswordHash())).isTrue();
    }

    private org.springframework.test.web.servlet.ResultActions login(String dni, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"dni\":\"" + dni + "\",\"password\":\"" + password + "\"}"));
    }

    private User saveUser(String dni, Role role, boolean firstLogin) {
        User user = new User("Ada", "Lovelace", dni, passwordEncoder.encode(PASSWORD), role);
        if (!firstLogin) {
            user.completeFirstLogin();
        }
        return userRepository.saveAndFlush(user);
    }

    private MockCookie authCookie(MvcResult result) {
        return new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE,
                result.getResponse().getCookie(JwtAuthenticationFilter.AUTH_COOKIE).getValue());
    }

    private MockCookie csrfCookie(MvcResult result) {
        return new MockCookie("XSRF-TOKEN", result.getResponse().getCookie("XSRF-TOKEN").getValue());
    }

    private String latestCsrfCookieValue(MvcResult result) {
        return Arrays.stream(result.getResponse().getCookies())
                .filter(cookie -> "XSRF-TOKEN".equals(cookie.getName()))
                .reduce((first, second) -> second)
                .orElseThrow()
                .getValue();
    }

    private long csrfCookieCount(MvcResult result) {
        return Arrays.stream(result.getResponse().getCookies())
                .filter(cookie -> "XSRF-TOKEN".equals(cookie.getName()))
                .count();
    }

    private String csrfToken(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private String passwordChange(String currentPassword, String newPassword, String confirmPassword) throws Exception {
        return objectMapper.writeValueAsString(new ChangePasswordRequest(currentPassword, newPassword, confirmPassword));
    }

    private String firstLoginPasswordChange(String newPassword, String confirmPassword) throws Exception {
        return objectMapper.writeValueAsString(new FirstLoginPasswordChangeRequest(newPassword, confirmPassword));
    }

    private String expiredToken(User user) {
        return Jwts.builder()
                .subject(user.getId().toString())
                .expiration(Date.from(Instant.now().minusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(JWT_SECRET)), Jwts.SIG.HS256)
                .compact();
    }
}
