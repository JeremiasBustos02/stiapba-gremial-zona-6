package com.stiapba.documentmanagement.template;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stiapba.documentmanagement.security.JwtAuthenticationFilter;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import com.stiapba.documentmanagement.template.repository.FieldDefinitionRepository;
import com.stiapba.documentmanagement.template.repository.TemplateRepository;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.repository.TemplateFieldRepository;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class TemplateIntegrationTest {
    private static final String ADMIN_PASSWORD = "admin-password";
    private static final String DELEGATE_PASSWORD = "delegate-password";

    @TempDir
    static Path storagePath;

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private TemplateRepository templateRepository;
    @Autowired private TemplateVariantRepository variantRepository;
    @Autowired private TemplateFieldRepository fieldRepository;
    @Autowired private FieldDefinitionRepository fieldDefinitionRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @DynamicPropertySource
    static void storageProperties(DynamicPropertyRegistry registry) {
        registry.add("app.template.storage-path", () -> storagePath.toString());
    }

    @BeforeEach
    void cleanDatabase() {
        fieldRepository.deleteAll();
        fieldRepository.flush();
        variantRepository.deleteAll();
        templateRepository.deleteAll();
        userRepository.deleteAll();
        userRepository.flush();
    }

    @Test
    void managesTemplatesAndVariantsWithRoleFilteringAndRealStorage() throws Exception {
        User admin = saveUser("30000201", Role.ADMIN, ADMIN_PASSWORD);
        User delegate = saveUser("30000202", Role.DELEGADO, DELEGATE_PASSWORD);
        MockMvcSession adminSession = authenticate(admin.getDni(), ADMIN_PASSWORD);
        MockMvcSession delegateSession = authenticate(delegate.getDni(), DELEGATE_PASSWORD);

        MvcResult templateResult = mockMvc.perform(post("/api/v1/templates")
                        .cookie(adminSession.authCookie(), adminSession.csrfCookie()).header("X-XSRF-TOKEN", adminSession.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Permiso Gremial\",\"descripcion\":\"Permiso estándar\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.active").value(true)).andReturn();
        String templateId = objectMapper.readTree(templateResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(put("/api/v1/templates/{id}", templateId).cookie(adminSession.authCookie(), adminSession.csrfCookie())
                        .header("X-XSRF-TOKEN", adminSession.csrfToken()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Permiso Gremial actualizado\",\"descripcion\":\"Descripción nueva\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nombre").value("Permiso Gremial actualizado"));
        mockMvc.perform(patch("/api/v1/templates/{id}/deactivate", templateId).cookie(adminSession.authCookie(), adminSession.csrfCookie())
                        .header("X-XSRF-TOKEN", adminSession.csrfToken())).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/templates").cookie(delegateSession.authCookie())).andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(patch("/api/v1/templates/{id}/activate", templateId).cookie(adminSession.authCookie(), adminSession.csrfCookie())
                        .header("X-XSRF-TOKEN", adminSession.csrfToken())).andExpect(status().isNoContent());

        byte[] pdf = Files.readAllBytes(Path.of("..", "docs", "pdf-templates", "Permiso Gremial Bruna.pdf"));
        MockMultipartFile upload = new MockMultipartFile("archivoPdf", "../../unsafe.pdf", "application/pdf", pdf);
        MvcResult variantResult = mockMvc.perform(multipart("/api/v1/templates/{templateId}/variants", templateId)
                        .file(upload).param("nombre", "Bruna")
                        .cookie(adminSession.authCookie(), adminSession.csrfCookie()).header("X-XSRF-TOKEN", adminSession.csrfToken()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.nombre").value("Bruna"))
                .andExpect(jsonPath("$.fileKey").doesNotExist()).andReturn();
        String variantId = objectMapper.readTree(variantResult.getResponse().getContentAsString()).get("id").asText();
        TemplateVariant storedVariant = variantRepository.findById(UUID.fromString(variantId)).orElseThrow();
        String oldFileKey = storedVariant.getFileKey();
        assertThat(Files.exists(storagePath.resolve(oldFileKey))).isTrue();

        mockMvc.perform(get("/api/v1/templates/{templateId}/variants", templateId).cookie(delegateSession.authCookie()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].nombre").value("Bruna"));
        mockMvc.perform(patch("/api/v1/templates/{templateId}/variants/{variantId}/deactivate", templateId, variantId)
                        .cookie(adminSession.authCookie(), adminSession.csrfCookie()).header("X-XSRF-TOKEN", adminSession.csrfToken()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/templates/{templateId}/variants", templateId).cookie(delegateSession.authCookie()))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(patch("/api/v1/templates/{templateId}/variants/{variantId}/activate", templateId, variantId)
                        .cookie(adminSession.authCookie(), adminSession.csrfCookie()).header("X-XSRF-TOKEN", adminSession.csrfToken()))
                .andExpect(status().isNoContent());
        mockMvc.perform(multipart("/api/v1/templates/{templateId}/variants", templateId).file(upload).param("nombre", "No permitido")
                        .cookie(delegateSession.authCookie(), delegateSession.csrfCookie()).header("X-XSRF-TOKEN", delegateSession.csrfToken()))
                .andExpect(status().isForbidden());

        MvcResult replacement = mockMvc.perform(multipart("/api/v1/templates/{templateId}/variants/{variantId}/file", templateId, variantId)
                        .file(new MockMultipartFile("archivoPdf", "replacement.pdf", "application/pdf", pdf))
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .cookie(adminSession.authCookie(), adminSession.csrfCookie()).header("X-XSRF-TOKEN", adminSession.csrfToken()))
                .andExpect(status().isOk()).andReturn();
        assertThat(objectMapper.readTree(replacement.getResponse().getContentAsString()).get("fileKey")).isNull();
        String newFileKey = variantRepository.findById(UUID.fromString(variantId)).orElseThrow().getFileKey();
        assertThat(newFileKey).isNotEqualTo(oldFileKey);
        assertThat(Files.exists(storagePath.resolve(oldFileKey))).isTrue();
        assertThat(Files.exists(storagePath.resolve(newFileKey))).isTrue();
        TestTransaction.flagForCommit();
        TestTransaction.end();
        assertThat(Files.exists(storagePath.resolve(oldFileKey))).isFalse();
    }

    @Test
    void rejectsCorruptAndNonPdfUploadsWithoutCreatingFiles() throws Exception {
        User admin = saveUser("30000203", Role.ADMIN, ADMIN_PASSWORD);
        MockMvcSession session = authenticate(admin.getDni(), ADMIN_PASSWORD);
        Template template = templateRepository.saveAndFlush(new Template("Plantilla", "Descripción"));
        long before = storedFileCount();

        mockMvc.perform(multipart("/api/v1/templates/{templateId}/variants", template.getId()).file(
                                new MockMultipartFile("archivoPdf", "archivo.txt", "text/plain", "not pdf".getBytes()))
                        .param("nombre", "Inválida").cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_PDF"));
        mockMvc.perform(multipart("/api/v1/templates/{templateId}/variants", template.getId()).file(
                                new MockMultipartFile("archivoPdf", "archivo.pdf", "application/pdf", "not pdf".getBytes()))
                        .param("nombre", "Corrupta").cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_PDF"));
        assertThat(storedFileCount()).isEqualTo(before);
    }

    @Test
    void createsAndListsAcroformMappingsWithInitializedFieldDefinitions() throws Exception {
        User admin = saveUser("30000204", Role.ADMIN, ADMIN_PASSWORD);
        MockMvcSession session = authenticate(admin.getDni(), ADMIN_PASSWORD);
        Template template = templateRepository.saveAndFlush(new Template("Permiso Gremial", "Descripción"));
        byte[] pdf = Files.readAllBytes(Path.of("..", "docs", "pdf-templates", "Permiso Gremial Bruna.pdf"));
        MvcResult variantResult = mockMvc.perform(multipart("/api/v1/templates/{templateId}/variants", template.getId())
                        .file(new MockMultipartFile("archivoPdf", "bruna.pdf", "application/pdf", pdf)).param("nombre", "AcroForm")
                        .cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken()))
                .andExpect(status().isCreated()).andReturn();
        String variantId = objectMapper.readTree(variantResult.getResponse().getContentAsString()).get("id").asText();
        FieldDefinition company = fieldDefinitionRepository.findByKey("company").orElseThrow();

        mockMvc.perform(post("/api/v1/templates/{templateId}/variants/{variantId}/fields/acroform", template.getId(), variantId)
                        .cookie(session.authCookie(), session.csrfCookie()).header("X-XSRF-TOKEN", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"fieldDefinitionId\":\"" + company.getId() + "\",\"acroFieldName\":\"Empresa\",\"required\":true,\"displayOrder\":1}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.fieldKey").value("company"))
                .andExpect(jsonPath("$.acroFieldName").value("Empresa"));

        mockMvc.perform(get("/api/v1/templates/{templateId}/variants/{variantId}/fields", template.getId(), variantId)
                        .cookie(session.authCookie()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].fieldKey").value("company"))
                .andExpect(jsonPath("$[0].acroFieldName").value("Empresa"));
    }

    private long storedFileCount() throws Exception {
        if (!Files.exists(storagePath)) return 0;
        try (Stream<Path> paths = Files.walk(storagePath)) {
            return paths.filter(Files::isRegularFile).count();
        }
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
