package com.stiapba.documentmanagement.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
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
class CompanyAgreementIntegrationTest {
    private static final String ADMIN_PASSWORD = "admin-password";
    private static final String DELEGATE_PASSWORD = "delegate-password";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private AgreementRepository agreementRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;

    @BeforeEach
    void cleanCatalog() {
        companyRepository.deleteAll();
        agreementRepository.deleteAll();
        userRepository.deleteAll();
        userRepository.flush();
    }

    @Test
    void adminCanManageCompanyAndAgreementAndDelegateReadsOnlyActive() throws Exception {
        User admin = saveUser("30000101", Role.ADMIN, ADMIN_PASSWORD);
        User delegate = saveUser("30000102", Role.DELEGADO, DELEGATE_PASSWORD);
        MockMvcSession adminSession = authenticate(admin.getDni(), ADMIN_PASSWORD);
        MockMvcSession delegateSession = authenticate(delegate.getDni(), DELEGATE_PASSWORD);

        MvcResult companyResult = mockMvc.perform(post("/api/v1/companies")
                        .cookie(adminSession.authCookie(), adminSession.csrfCookie()).header("X-XSRF-TOKEN", adminSession.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Empresa Uno\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.active").value(true)).andReturn();
        String companyId = objectMapper.readTree(companyResult.getResponse().getContentAsString()).get("id").asText();
        mockMvc.perform(put("/api/v1/companies/{id}", companyId).cookie(adminSession.authCookie(), adminSession.csrfCookie())
                        .header("X-XSRF-TOKEN", adminSession.csrfToken()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Empresa Actualizada\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nombre").value("Empresa Actualizada"));
        mockMvc.perform(patch("/api/v1/companies/{id}/deactivate", companyId).cookie(adminSession.authCookie(), adminSession.csrfCookie())
                        .header("X-XSRF-TOKEN", adminSession.csrfToken())).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/companies").cookie(delegateSession.authCookie())).andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(patch("/api/v1/companies/{id}/activate", companyId).cookie(adminSession.authCookie(), adminSession.csrfCookie())
                        .header("X-XSRF-TOKEN", adminSession.csrfToken())).andExpect(status().isNoContent());

        MvcResult agreementResult = mockMvc.perform(post("/api/v1/agreements")
                        .cookie(adminSession.authCookie(), adminSession.csrfCookie()).header("X-XSRF-TOKEN", adminSession.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"descripcion\":\"Convenio sin código\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.codigo").doesNotExist()).andReturn();
        String agreementId = objectMapper.readTree(agreementResult.getResponse().getContentAsString()).get("id").asText();
        mockMvc.perform(put("/api/v1/agreements/{id}", agreementId).cookie(adminSession.authCookie(), adminSession.csrfCookie())
                        .header("X-XSRF-TOKEN", adminSession.csrfToken()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"codigo\":\"C-1\",\"descripcion\":\"Convenio actualizado\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.codigo").value("C-1"));
        mockMvc.perform(patch("/api/v1/agreements/{id}/deactivate", agreementId).cookie(adminSession.authCookie(), adminSession.csrfCookie())
                        .header("X-XSRF-TOKEN", adminSession.csrfToken())).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/agreements").cookie(delegateSession.authCookie())).andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void delegateCannotWriteAndRequiredFieldsAreValidated() throws Exception {
        User delegate = saveUser("30000103", Role.DELEGADO, DELEGATE_PASSWORD);
        MockMvcSession session = authenticate(delegate.getDni(), DELEGATE_PASSWORD);

        mockMvc.perform(post("/api/v1/companies").cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"No permitido\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/agreements").cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"codigo\":\"C-1\"}"))
                .andExpect(status().isForbidden());
        assertThat(mockMvc.perform(get("/api/v1/companies").cookie(session.authCookie())).andReturn().getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void validatesRequiredCompanyAndAgreementFieldsForAdmin() throws Exception {
        User admin = saveUser("30000104", Role.ADMIN, ADMIN_PASSWORD);
        MockMvcSession session = authenticate(admin.getDni(), ADMIN_PASSWORD);

        mockMvc.perform(post("/api/v1/companies").cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\" \"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(post("/api/v1/agreements").cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"codigo\":\"C-1\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.descripcion").exists());
    }

    @Test
    void managesOptionalCompanyAgreementAndRejectsInactiveAgreement() throws Exception {
        User admin = saveUser("30000105", Role.ADMIN, ADMIN_PASSWORD);
        MockMvcSession session = authenticate(admin.getDni(), ADMIN_PASSWORD);
        MvcResult agreementResult = mockMvc.perform(post("/api/v1/agreements")
                        .cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"codigo\":\"C-1\",\"descripcion\":\"Convenio Uno\"}"))
                .andExpect(status().isCreated()).andReturn();
        String agreementId = objectMapper.readTree(agreementResult.getResponse().getContentAsString()).get("id").asText();

        MvcResult withoutAgreement = mockMvc.perform(post("/api/v1/companies")
                        .cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Empresa Sin Convenio\",\"agreementId\":null}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.agreementId").doesNotExist()).andReturn();
        String companyId = objectMapper.readTree(withoutAgreement.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(put("/api/v1/companies/{id}", companyId)
                        .cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Empresa Con Convenio\",\"agreementId\":\"" + agreementId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agreementId").value(agreementId))
                .andExpect(jsonPath("$.agreement.codigo").value("C-1"));

        mockMvc.perform(patch("/api/v1/agreements/{id}/deactivate", agreementId)
                        .cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken()))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/companies")
                        .cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Empresa Inválida\",\"agreementId\":\"" + agreementId + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("AGREEMENT_NOT_AVAILABLE"));
    }

    private User saveUser(String dni, Role role, String password) {
        User user = new User("Test", "User", dni, passwordEncoder.encode(password), role);
        user.completeFirstLogin();
        return userRepository.saveAndFlush(user);
    }

    private MockMvcSession authenticate(String dni, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dni\":\"" + dni + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn();
        MockCookie auth = new MockCookie(JwtAuthenticationFilter.AUTH_COOKIE, result.getResponse().getCookie(JwtAuthenticationFilter.AUTH_COOKIE).getValue());
        MockCookie csrf = new MockCookie("XSRF-TOKEN", result.getResponse().getCookie("XSRF-TOKEN").getValue());
        return new MockMvcSession(auth, csrf);
    }

    private record MockMvcSession(MockCookie authCookie, MockCookie csrfCookie) {
        String csrfToken() { return csrfCookie.getValue(); }
    }
}
