package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.province.entity.Province;
import com.stiapba.documentmanagement.province.repository.ProvinceRepository;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import com.stiapba.documentmanagement.template.entity.FieldSourceType;
import com.stiapba.documentmanagement.template.entity.FieldType;
import com.stiapba.documentmanagement.template.entity.TemplateField;
import com.stiapba.documentmanagement.template.entity.TemplateFieldMode;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
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
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.lenient;

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
    @Mock private DocumentRecordRepository documentRecordRepository;
    @Mock private DocumentNumberService documentNumberService;

    private DocumentGenerationService service;
    private PermisoGremialRequest request;
    private UserPrincipal principal;

    @BeforeEach
    void setUp() throws Exception {
        service = new DocumentGenerationService(provinceRepository, companyRepository, userRepository, agreementRepository,
                variantRepository, fileStorage, generator, pdfTemplateRenderer, documentRecordRepository, documentNumberService);
        request = new PermisoGremialRequest(UUID.randomUUID(), LocalDate.of(2026, 8, 18), UUID.randomUUID(),
                UUID.randomUUID(), 21, UUID.randomUUID(), UUID.randomUUID());
        principal = new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false);
        lenient().when(userRepository.findById(principal.id())).thenReturn(Optional.of(new User("Admin", "User", "999", "hash", Role.ADMIN)));
        lenient().when(documentNumberService.nextPermisoGremialNumber()).thenReturn("PG-2026-000001");
        lenient().when(documentRecordRepository.save(any(DocumentRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void generatesUsingResolvedPersistentData() throws Exception {
        stubValidData();
        assertThat(service.generatePermisoGremial(request, principal).content()).containsExactly(2);
        verify(documentRecordRepository).save(argThat(record -> record.getSnapshot().get("company").equals("Empresa Ejemplo")
                && record.getSnapshot().get("delegateDni").equals("40123456")
                && record.getPublicNumber().equals("PG-2026-000001")));
    }

    @Test
    void doesNotCreateHistoryWhenPdfGenerationFails() throws Exception {
        stubProvince();
        stubCompany();
        stubDelegate();
        stubAgreement();
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Descripción"), "Bruna", "template.pdf");
        variant.markLegacyPositioned();
        when(variantRepository.findById(request.variantId())).thenReturn(Optional.of(variant));
        when(fileStorage.load("template.pdf")).thenReturn(new byte[]{1});
        when(generator.generate(any(), any())).thenThrow(new DocumentException(422, "PDF_TEXT_TOO_LONG", "No entra."));

        assertCode("PDF_TEXT_TOO_LONG");
        verify(documentRecordRepository, never()).save(any());
    }

    @Test
    void createsDescriptiveSanitizedFilename() {
        assertThat(DocumentGenerationService.filename("PG-2026-000123", "Juán Pérez / Zona 6"))
                .isEqualTo("pg-2026-000123_permiso-gremial_juan-perez-zona-6.pdf");
    }

    @Test
    void preservesDynamicManualValuesInSnapshot() throws Exception {
        stubProvince();
        stubCompany();
        stubDelegate();
        stubAgreement();
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Descripción"), "Bruna", "template.pdf");
        variant.addField(new TemplateField(variant,
                new FieldDefinition("reference", "Referencia", FieldType.TEXT, FieldSourceType.MANUAL, false),
                TemplateFieldMode.ACROFORM, "reference", false, 1));
        when(variantRepository.findById(request.variantId())).thenReturn(Optional.of(variant));
        when(fileStorage.load("template.pdf")).thenReturn(new byte[]{1});
        when(pdfTemplateRenderer.render(eq(variant), any(), any())).thenReturn(new byte[]{3});
        Map<UUID, String> manualValues = new java.util.HashMap<>();
        manualValues.put(null, "REF-42");
        request = new PermisoGremialRequest(request.provinceId(), request.issueDate(), request.companyId(), request.delegateId(),
                request.permitDay(), request.agreementId(), request.variantId(), manualValues);

        service.generatePermisoGremial(request, principal);

        verify(documentRecordRepository).save(argThat(record -> "REF-42".equals(record.getSnapshot().get("reference"))));
    }

    @Test
    void delegateCannotRegenerateAnotherUsersDocument() {
        UUID recordId = UUID.randomUUID();
        when(documentRecordRepository.findById(recordId)).thenReturn(Optional.of(record(UUID.randomUUID())));

        assertThatThrownBy(() -> service.regenerate(recordId, new UserPrincipal(UUID.randomUUID(), Role.DELEGADO, false)))
                .isInstanceOfSatisfying(DocumentException.class, exception -> assertThat(exception.getCode()).isEqualTo("DOCUMENT_RECORD_FORBIDDEN"));
        verify(documentRecordRepository, never()).save(any());
    }

    @Test
    void regeneratesFromHistoricalSnapshotWithoutCreatingAnotherRecord() throws Exception {
        UUID recordId = UUID.randomUUID();
        DocumentRecord record = record(principal.id());
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Descripción"), "Bruna", "template.pdf");
        variant.markLegacyPositioned();
        when(documentRecordRepository.findById(recordId)).thenReturn(Optional.of(record));
        when(variantRepository.findById(record.getVariantId())).thenReturn(Optional.of(variant));
        when(fileStorage.load("template.pdf")).thenReturn(new byte[]{1});
        when(generator.generate(argThat(data -> data.companyName().equals("Empresa histórica")
                && data.delegateText().equals("Ana Pérez DNI 40123456")), any())).thenReturn(new byte[]{4});

        assertThat(service.regenerate(recordId, principal).content()).containsExactly(4);
        verify(documentRecordRepository, never()).save(any());
    }

    private DocumentRecord record(UUID creatorId) {
        return new DocumentRecord("PG-2026-000001", DocumentType.PERMISO_GREMIAL, creatorId, "Admin User",
                UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 8, 18), "Empresa histórica", "Ana Pérez", Map.of(
                "province", "Buenos Aires", "issueDate", "2026-08-18", "companyName", "Empresa histórica",
                "delegate", "Ana Pérez DNI 40123456", "permitDay", "21", "agreementCode", "CCT-123"));
    }

    @Test
    void rejectsUnconfiguredNewVariantWithoutUsingLegacyRenderer() throws Exception {
        stubProvince();
        stubCompany();
        stubDelegate();
        stubAgreement();
        when(variantRepository.findById(request.variantId())).thenReturn(Optional.of(new TemplateVariant(new Template("Otra", "Descripción"), "Nueva", "template.pdf")));
        when(fileStorage.load("template.pdf")).thenReturn(new byte[]{1});

        assertCode("TEMPLATE_FIELDS_NOT_CONFIGURED");
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
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Descripción"), "Bruna", "template.pdf");
        variant.markLegacyPositioned();
        when(variantRepository.findById(request.variantId())).thenReturn(Optional.of(variant));
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
        variant.addField(new TemplateField(variant,
                new FieldDefinition("delegate", "Delegado", FieldType.TEXT, FieldSourceType.DELEGATE, true), TemplateFieldMode.ACROFORM,
                "Nombre delegado y dni", true, 1));
        when(variantRepository.findById(request.variantId())).thenReturn(Optional.of(variant));
        when(fileStorage.load("template.pdf")).thenReturn(new byte[]{1});
        when(pdfTemplateRenderer.render(eq(variant), argThat(values ->
                "Ana Pérez DNI 40123456".equals(values.get("delegate"))
                        && "40123456".equals(values.get("delegateDni"))), any(byte[].class))).thenReturn(new byte[]{3});

        assertThat(service.generatePermisoGremial(request, principal).content()).containsExactly(3);
    }

    private void assertCode(String expectedCode) {
        assertThatThrownBy(() -> service.generatePermisoGremial(request, principal))
                .isInstanceOfSatisfying(DocumentException.class, exception -> assertThat(exception.getCode()).isEqualTo(expectedCode));
    }

    private void stubValidData() throws Exception {
        stubProvince();
        stubCompany();
        stubDelegate();
        stubAgreement();
        TemplateVariant variant = new TemplateVariant(new Template("Permiso Gremial", "Descripción"), "Bruna", "template.pdf");
        variant.markLegacyPositioned();
        when(variantRepository.findById(request.variantId())).thenReturn(Optional.of(variant));
        when(fileStorage.load("template.pdf")).thenReturn(new byte[]{1});
        when(generator.generate(any(), any())).thenReturn(new byte[]{2});
    }

    private void stubProvince() { when(provinceRepository.findById(request.provinceId())).thenReturn(Optional.of(new Province("Buenos Aires"))); }
    private void stubCompany() { when(companyRepository.findById(request.companyId())).thenReturn(Optional.of(new Company("Empresa Ejemplo"))); }
    private void stubDelegate() { when(userRepository.findById(request.delegateId())).thenReturn(Optional.of(new User("Ana", "Pérez", "40123456", "hash", Role.DELEGADO))); }
    private void stubAgreement() { when(agreementRepository.findById(request.agreementId())).thenReturn(Optional.of(new Agreement("CCT-123", "Convenio"))); }
}
