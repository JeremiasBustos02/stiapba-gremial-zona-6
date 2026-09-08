package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.province.entity.Province;
import com.stiapba.documentmanagement.province.repository.ProvinceRepository;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import com.stiapba.documentmanagement.template.entity.TemplateField;
import com.stiapba.documentmanagement.template.entity.TemplateFieldMode;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentGenerationServiceTest {
    @Mock private ProvinceRepository provinceRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;
    @Mock private AgreementRepository agreementRepository;
    @Mock private TemplateVariantRepository variantRepository;
    @Mock private TemplateFileStorage fileStorage;
    @Mock private DocumentGenerator generator;
    @Mock private PdfTemplateRenderer pdfTemplateRenderer;

    private DocumentGenerationService service;
    private PermisoGremialRequest request;

    @BeforeEach
    void setUp() throws Exception {
        service = new DocumentGenerationService(provinceRepository, companyRepository, userRepository, agreementRepository,
                variantRepository, fileStorage, generator, pdfTemplateRenderer);
        request = new PermisoGremialRequest(UUID.randomUUID(), LocalDate.of(2026, 8, 18), UUID.randomUUID(),
                UUID.randomUUID(), 21, UUID.randomUUID(), UUID.randomUUID());
    }

    @Test
    void generatesUsingResolvedPersistentData() throws Exception {
        stubValidData();
        assertThat(service.generatePermisoGremial(request)).containsExactly(2);
    }

    @Test
    void rejectsMissingProvince() {
        when(provinceRepository.findById(request.provinceId())).thenReturn(Optional.empty());
        assertCode("PROVINCE_NOT_FOUND");
    }

    @Test
    void rejectsMissingCompany() {
        stubProvince();
        when(companyRepository.findById(request.companyId())).thenReturn(Optional.empty());
        assertCode("COMPANY_NOT_FOUND");
    }

    @Test
    void rejectsMissingOrNonDelegateUser() {
        stubProvince();
        stubCompany();
        when(userRepository.findById(request.delegateId())).thenReturn(Optional.of(new User("Admin", "User", "1", "hash", Role.ADMIN)));
        assertCode("DELEGATE_NOT_FOUND");
    }

    @Test
    void rejectsMissingAgreementAndAgreementWithoutCode() {
        stubProvince();
        stubCompany();
        stubDelegate();
        when(agreementRepository.findById(request.agreementId())).thenReturn(Optional.empty());
        assertCode("AGREEMENT_NOT_FOUND");
        when(agreementRepository.findById(request.agreementId())).thenReturn(Optional.of(new Agreement(null, "Convenio")));
        assertCode("AGREEMENT_CODE_REQUIRED");
    }

    @Test
    void rejectsMissingVariantAndMissingFile() throws Exception {
        stubProvince();
        stubCompany();
        stubDelegate();
        stubAgreement();
        when(variantRepository.findById(request.variantId())).thenReturn(Optional.empty());
        assertCode("TEMPLATE_VARIANT_NOT_FOUND");
        when(variantRepository.findById(request.variantId())).thenReturn(Optional.of(new TemplateVariant(new Template("Permiso Gremial", "Descripción"), "Bruna", "template.pdf")));
        when(fileStorage.load("template.pdf")).thenThrow(new IOException("missing"));
        assertCode("TEMPLATE_FILE_UNAVAILABLE");
    }

    @Test
    void rejectsInvalidPermitDay() {
        request = new PermisoGremialRequest(request.provinceId(), request.issueDate(), request.companyId(), request.delegateId(),
                32, request.agreementId(), request.variantId());
        assertCode("INVALID_PERMIT_DAY");
    }

    @Test
    void generatesAcroformVariantWithLogicalValues() throws Exception {
        stubProvince();
        stubCompany();
        stubDelegate();
        stubAgreement();
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Descripción"), "Bruna AcroForm", "template.pdf");
        variant.addField(new TemplateField(variant, new FieldDefinition("delegate"), TemplateFieldMode.ACROFORM,
                "Nombre delegado y dni", true, 1));
        when(variantRepository.findById(request.variantId())).thenReturn(Optional.of(variant));
        when(fileStorage.load("template.pdf")).thenReturn(new byte[]{1});
        when(pdfTemplateRenderer.render(eq(variant), argThat(values ->
                "Ana Pérez DNI 40123456".equals(values.get("delegate"))
                        && "40123456".equals(values.get("delegateDni"))), any(byte[].class))).thenReturn(new byte[]{3});

        assertThat(service.generatePermisoGremial(request)).containsExactly(3);
    }

    private void assertCode(String expectedCode) {
        assertThatThrownBy(() -> service.generatePermisoGremial(request))
                .isInstanceOfSatisfying(DocumentException.class, exception -> assertThat(exception.getCode()).isEqualTo(expectedCode));
    }

    private void stubValidData() throws Exception {
        stubProvince();
        stubCompany();
        stubDelegate();
        stubAgreement();
        when(variantRepository.findById(request.variantId())).thenReturn(Optional.of(new TemplateVariant(new Template("Permiso Gremial", "Descripción"), "Bruna", "template.pdf")));
        when(fileStorage.load("template.pdf")).thenReturn(new byte[]{1});
        when(generator.generate(any(), any())).thenReturn(new byte[]{2});
    }

    private void stubProvince() { when(provinceRepository.findById(request.provinceId())).thenReturn(Optional.of(new Province("Buenos Aires"))); }
    private void stubCompany() { when(companyRepository.findById(request.companyId())).thenReturn(Optional.of(new Company("Empresa Ejemplo"))); }
    private void stubDelegate() { when(userRepository.findById(request.delegateId())).thenReturn(Optional.of(new User("Ana", "Pérez", "40123456", "hash", Role.DELEGADO))); }
    private void stubAgreement() { when(agreementRepository.findById(request.agreementId())).thenReturn(Optional.of(new Agreement("CCT-123", "Convenio"))); }
}
