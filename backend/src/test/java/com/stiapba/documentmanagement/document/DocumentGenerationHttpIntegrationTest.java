package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.auth.LoginRequest;
import com.stiapba.documentmanagement.auth.LoginResponse;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.province.entity.Province;
import com.stiapba.documentmanagement.province.repository.ProvinceRepository;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateRepository;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.security.jwt.secret=dGVzdC1qd3Qtc2VjcmV0LW11c3QtYmUtYXQtbGVhc3QtMzItYnl0ZXMtbG9uZw==",
        "app.security.jwt.expiration-seconds=3600",
        "app.security.initial-admin.dni=",
        "app.security.initial-admin.password=",
        "app.security.initial-admin.name=",
        "app.security.initial-admin.lastname="
})
class DocumentGenerationHttpIntegrationTest {
    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private AgreementRepository agreementRepository;
    @Autowired private ProvinceRepository provinceRepository;
    @Autowired private TemplateRepository templateRepository;
    @Autowired private TemplateVariantRepository variantRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DataSource dataSource;

    private UUID adminId;
    private UUID delegateId;
    private UUID companyId;
    private UUID agreementId;

    @AfterEach
    void cleanUp() {
        if (agreementId != null) agreementRepository.deleteById(agreementId);
        if (companyId != null) companyRepository.deleteById(companyId);
        if (delegateId != null) userRepository.deleteById(delegateId);
        if (adminId != null) userRepository.deleteById(adminId);
    }

    @Test
    void generatesPermisoGremialThroughTheRealHttpStack() throws Exception {
        User admin = activeUser("Admin", "M8", "91000001", Role.ADMIN, "admin-password");
        User delegate = activeUser("Ana", "Paz", "92000001", Role.DELEGADO, "delegate-password");
        adminId = userRepository.saveAndFlush(admin).getId();
        delegateId = userRepository.saveAndFlush(delegate).getId();
        companyId = companyRepository.saveAndFlush(new Company("ACME")).getId();
        agreementId = agreementRepository.saveAndFlush(new Agreement("CCT1", "Convenio M8")).getId();

        Province province = provinceRepository.findAll().stream().filter(Province::isActive).findFirst().orElseThrow();
        Template template = templateRepository.findByNombre("Permiso Gremial").orElseThrow();
        TemplateVariant variant = variantRepository.findFirstByTemplate_IdAndNombre(template.getId(), "Bruna").orElseThrow();
        String originalFileKey = variant.getFileKey();
        Path source = Path.of("..", "docs", "pdf-templates", "Permiso-Gremial-Bruna.pdf");
        byte[] sourceHash = MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(source));

        ResponseEntity<LoginResponse> login = restTemplate.postForEntity("/api/v1/auth/login",
                new LoginRequest(admin.getDni(), "admin-password"), LoginResponse.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        String authCookie = cookie(login.getHeaders(), "AUTH_TOKEN");

        ResponseEntity<Void> me = restTemplate.exchange("/api/v1/auth/me", HttpMethod.GET,
                new HttpEntity<>(headers(authCookie, null)), Void.class);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        String csrfCookie = cookie(me.getHeaders(), "XSRF-TOKEN");

        PermisoGremialRequest request = new PermisoGremialRequest(province.getId(), LocalDate.of(2026, 8, 18), companyId,
                delegateId, 21, agreementId, variant.getId());
        ResponseEntity<byte[]> response = restTemplate.exchange("/api/v1/documents/permiso-gremial/generate", HttpMethod.POST,
                new HttpEntity<>(request, headers(authCookie, csrfCookie)), byte[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PDF);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).startsWith("inline;");
        assertThat(response.getBody()).isNotEmpty();
        try (PDDocument generated = Loader.loadPDF(response.getBody())) {
            assertThat(generated.getNumberOfPages()).isEqualTo(1);
        }
        assertThat(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(source))).isEqualTo(sourceHash);
        assertThat(variantRepository.findById(variant.getId()).orElseThrow().getFileKey()).isEqualTo(originalFileKey);
        try (var connection = dataSource.getConnection(); var tables = connection.getMetaData().getTables(null, null, "documents", null)) {
            assertThat(tables.next()).isFalse();
        }
    }

    private User activeUser(String nombre, String apellido, String dni, Role role, String password) {
        User user = new User(nombre, apellido, dni, passwordEncoder.encode(password), role);
        user.completeFirstLogin();
        return user;
    }

    private HttpHeaders headers(String authCookie, String csrfCookie) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.COOKIE, csrfCookie == null ? "AUTH_TOKEN=" + authCookie
                : "AUTH_TOKEN=" + authCookie + "; XSRF-TOKEN=" + csrfCookie);
        if (csrfCookie != null) headers.set("X-XSRF-TOKEN", csrfCookie);
        return headers;
    }

    private String cookie(HttpHeaders headers, String name) {
        List<String> cookies = headers.get(HttpHeaders.SET_COOKIE);
        return cookies.stream().filter(value -> value.startsWith(name + "="))
                .map(value -> value.substring(name.length() + 1, value.indexOf(';'))).findFirst().orElseThrow();
    }
}
