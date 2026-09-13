package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.agreement.entity.Agreement;
import com.stiapba.documentmanagement.agreement.repository.AgreementRepository;
import com.stiapba.documentmanagement.company.entity.Company;
import com.stiapba.documentmanagement.company.repository.CompanyRepository;
import com.stiapba.documentmanagement.document.entity.DocumentRecord;
import com.stiapba.documentmanagement.document.repository.DocumentRecordRepository;
import com.stiapba.documentmanagement.province.entity.Province;
import com.stiapba.documentmanagement.province.repository.ProvinceRepository;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.template.entity.DocumentType;
import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import com.stiapba.documentmanagement.template.entity.FieldSourceType;
import com.stiapba.documentmanagement.template.entity.FieldType;
import com.stiapba.documentmanagement.template.entity.TemplateField;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import com.stiapba.documentmanagement.user.entity.Role;
import com.stiapba.documentmanagement.user.entity.User;
import com.stiapba.documentmanagement.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Component
public class PermisoGremialDocumentTypeHandler implements DocumentTypeHandler {
    private final ProvinceRepository provinceRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final AgreementRepository agreementRepository;
    private final TemplateVariantRepository variantRepository;
    private final TemplateFileStorage fileStorage;
    private final DocumentGenerator generator;
    private final PdfTemplateRenderer pdfTemplateRenderer;
    private final DocumentRecordRepository documentRecordRepository;
    private final DocumentNumberService documentNumberService;

    public PermisoGremialDocumentTypeHandler(ProvinceRepository provinceRepository, CompanyRepository companyRepository,
                                             UserRepository userRepository, AgreementRepository agreementRepository,
                                             TemplateVariantRepository variantRepository, TemplateFileStorage fileStorage,
                                             DocumentGenerator generator, PdfTemplateRenderer pdfTemplateRenderer,
                                             DocumentRecordRepository documentRecordRepository, DocumentNumberService documentNumberService) {
        this.provinceRepository = provinceRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.agreementRepository = agreementRepository;
        this.variantRepository = variantRepository;
        this.fileStorage = fileStorage;
        this.generator = generator;
        this.pdfTemplateRenderer = pdfTemplateRenderer;
        this.documentRecordRepository = documentRecordRepository;
        this.documentNumberService = documentNumberService;
    }

    @Override
    public DocumentType documentType() { return DocumentType.PERMISO_GREMIAL; }

    @Override
    @Transactional
    public DocumentGenerationService.GeneratedDocument generate(DocumentGenerationRequest request, UserPrincipal principal) {
        PermisoGremialRequest permiso = toPermisoRequest(request);
        if (permiso.issueDate().isAfter(LocalDate.now())) {
            throw new DocumentException(400, "INVALID_ISSUE_DATE", "La fecha de emisión no puede ser futura.");
        }
        if (permiso.permitDay() < 1 || permiso.permitDay() > 31) {
            throw new DocumentException(400, "INVALID_PERMIT_DAY", "El día de permiso debe estar entre 1 y 31.");
        }
        Province province = provinceRepository.findById(permiso.provinceId()).filter(Province::isActive)
                .orElseThrow(() -> notFound("PROVINCE_NOT_FOUND", "No encontramos una provincia activa."));
        Company company = companyRepository.findById(permiso.companyId()).filter(Company::isActive)
                .orElseThrow(() -> notFound("COMPANY_NOT_FOUND", "No encontramos una empresa activa."));
        User delegate = userRepository.findById(permiso.delegateId()).filter(user -> user.isActive() && user.getRole() == Role.DELEGADO)
                .orElseThrow(() -> notFound("DELEGATE_NOT_FOUND", "No encontramos un delegado activo."));
        Agreement agreement = agreementRepository.findById(permiso.agreementId()).filter(Agreement::isActive)
                .orElseThrow(() -> notFound("AGREEMENT_NOT_FOUND", "No encontramos un convenio activo."));
        if (agreement.getCodigo() == null || agreement.getCodigo().isBlank()) {
            throw new DocumentException(422, "AGREEMENT_CODE_REQUIRED", "El convenio seleccionado no tiene código para imprimir.");
        }
        TemplateVariant variant = variantRepository.findById(permiso.variantId()).filter(value -> value.isActive() && value.getTemplate().isActive())
                .orElseThrow(() -> notFound("TEMPLATE_VARIANT_NOT_FOUND", "No encontramos una variante activa de Permiso Gremial."));
        if (variant.getTemplate().getDocumentType() != documentType()) {
            throw new DocumentException(422, "TEMPLATE_DOCUMENT_TYPE_UNSUPPORTED", "La plantilla seleccionada no corresponde a Permiso Gremial.");
        }
        Map<String, String> values = new LinkedHashMap<>(logicalValues(province, company, delegate, agreement, permiso));
        addManualValues(variant, permiso.manualValues(), values);
        byte[] pdf = render(variant, values);
        User createdBy = userRepository.findById(principal.id()).filter(User::isActive)
                .orElseThrow(() -> new DocumentException(401, "SESSION_INVALID", "La sesión no es válida o expiró."));
        String publicNumber = documentNumberService.nextPermisoGremialNumber();
        String delegateName = delegate.getNombre() + " " + delegate.getApellido();
        DocumentRecord record = documentRecordRepository.save(new DocumentRecord(publicNumber, documentType(), createdBy.getId(),
                createdBy.getNombre() + " " + createdBy.getApellido(), variant.getTemplate().getId(), variant.getId(), permiso.issueDate(),
                company.getNombre(), delegateName, values));
        return new DocumentGenerationService.GeneratedDocument(pdf, record.getId(), publicNumber, filename(publicNumber, delegateName));
    }

    @Override
    @Transactional
    public DocumentGenerationService.GeneratedDocument regenerate(DocumentRecord record) {
        TemplateVariant variant = variantRepository.findById(record.getVariantId())
                .orElseThrow(() -> notFound("TEMPLATE_VARIANT_NOT_FOUND", "No encontramos la variante usada por este documento."));
        return new DocumentGenerationService.GeneratedDocument(render(variant, record.getSnapshot()), record.getId(), record.getPublicNumber(),
                filename(record.getPublicNumber(), record.getDelegateName()));
    }

    @Override
    @Transactional
    public List<DocumentGenerationService.ManualFieldResponse> manualFields(UUID variantId) {
        TemplateVariant variant = variantRepository.findById(variantId)
                .filter(value -> value.isActive() && value.getTemplate().isActive() && value.getTemplate().getDocumentType() == documentType())
                .orElseThrow(() -> notFound("TEMPLATE_VARIANT_NOT_FOUND", "No encontramos una variante activa de Permiso Gremial."));
        return variant.getFields().stream().filter(field -> field.getFieldDefinition().getSourceType() == FieldSourceType.MANUAL)
                .collect(java.util.stream.Collectors.toMap(field -> field.getFieldDefinition().getId(), this::manualFieldResponse,
                        (first, second) -> new DocumentGenerationService.ManualFieldResponse(first.id(), first.label(), first.type(), first.required() || second.required()), LinkedHashMap::new))
                .values().stream().toList();
    }

    private PermisoGremialRequest toPermisoRequest(DocumentGenerationRequest request) {
        Map<String, String> values = request.baseValues() == null ? Map.of() : request.baseValues();
        try {
            return new PermisoGremialRequest(requiredUuid(values, "provinceId"), requiredDate(values, "issueDate"),
                    requiredUuid(values, "companyId"), requiredUuid(values, "delegateId"), requiredInteger(values, "permitDay"),
                    requiredUuid(values, "agreementId"), request.variantId(), request.manualValues());
        } catch (IllegalArgumentException exception) {
            throw new DocumentException(400, "DOCUMENT_BASE_VALUE_INVALID", "Los datos base del documento no tienen el formato esperado.");
        }
    }

    private UUID requiredUuid(Map<String, String> values, String key) { return UUID.fromString(required(values, key)); }
    private LocalDate requiredDate(Map<String, String> values, String key) { return LocalDate.parse(required(values, key)); }
    private Integer requiredInteger(Map<String, String> values, String key) { return Integer.valueOf(required(values, key)); }
    private String required(Map<String, String> values, String key) {
        String value = values.get(key);
        if (value == null || value.isBlank()) throw new IllegalArgumentException(key);
        return value;
    }

    private Map<String, String> logicalValues(Province province, Company company, User delegate, Agreement agreement, PermisoGremialRequest request) {
        String delegateName = delegate.getNombre() + " " + delegate.getApellido();
        Map<String, String> values = new LinkedHashMap<>();
        values.put("province", province.getName()); values.put("provinceId", idValue(province.getId())); values.put("company", company.getNombre());
        values.put("delegate", delegateName + " DNI " + delegate.getDni()); values.put("delegateDni", delegate.getDni());
        values.put("agreement", agreement.getCodigo().trim()); values.put("issueDay", Integer.toString(request.issueDate().getDayOfMonth()));
        values.put("issueMonth", request.issueDate().getMonth().getDisplayName(TextStyle.FULL, Locale.forLanguageTag("es-AR")));
        values.put("issueYear", String.format("%02d", request.issueDate().getYear() % 100)); values.put("permitDay", Integer.toString(request.permitDay()));
        values.put("issueDate", request.issueDate().toString()); values.put("companyName", company.getNombre()); values.put("companyId", idValue(company.getId()));
        values.put("delegateName", delegateName); values.put("delegateId", idValue(delegate.getId())); values.put("agreementCode", agreement.getCodigo().trim());
        values.put("agreementId", idValue(agreement.getId()));
        return values;
    }

    private byte[] render(TemplateVariant variant, Map<String, String> values) {
        try {
            byte[] templateContent = fileStorage.load(variant.getFileKey());
            if (!variant.getFields().isEmpty()) return pdfTemplateRenderer.render(variant, values, templateContent);
            if (!variant.isLegacyPositioned()) throw new DocumentException(422, "TEMPLATE_FIELDS_NOT_CONFIGURED", "La variante no tiene campos configurados para generar el documento.");
            return generator.generate(new PermisoGremialData(values.get("province"), LocalDate.parse(values.get("issueDate")), values.get("companyName"),
                    values.get("delegate"), Integer.parseInt(values.get("permitDay")), values.get("agreementCode")), templateContent);
        } catch (DocumentException exception) { throw exception;
        } catch (IOException exception) { throw new DocumentException(422, "TEMPLATE_FILE_UNAVAILABLE", "No pudimos leer el archivo de la plantilla."); }
    }

    private void addManualValues(TemplateVariant variant, Map<UUID, String> requestedValues, Map<String, String> values) {
        Map<UUID, String> submitted = requestedValues == null ? Map.of() : requestedValues;
        for (TemplateField field : variant.getFields()) {
            FieldDefinition definition = field.getFieldDefinition();
            if (definition.getSourceType() != FieldSourceType.MANUAL) continue;
            String value = submitted.get(definition.getId());
            if (field.isRequired() && (value == null || value.isBlank())) throw new DocumentException(422, "TEMPLATE_FIELD_REQUIRED", "Falta un dato obligatorio para completar la plantilla.");
            if (value != null && !value.isBlank()) {
                validateManualValue(definition.getType(), value);
                values.put(definition.getKey(), value.trim()); values.put("manual:" + definition.getId(), value.trim());
            }
        }
    }

    private void validateManualValue(FieldType type, String value) {
        try { if (type == FieldType.DATE) LocalDate.parse(value); if (type == FieldType.NUMBER) new java.math.BigDecimal(value); }
        catch (RuntimeException exception) { throw new DocumentException(400, "MANUAL_FIELD_VALUE_INVALID", "Uno de los datos ingresados no tiene el formato esperado."); }
    }

    private DocumentGenerationService.ManualFieldResponse manualFieldResponse(TemplateField field) {
        FieldDefinition definition = field.getFieldDefinition();
        return new DocumentGenerationService.ManualFieldResponse(definition.getId(), definition.getLabel(), definition.getType(), field.isRequired());
    }

    private String idValue(UUID id) { return id == null ? "" : id.toString(); }
    static String filename(String publicNumber, String delegateName) { return sanitize(publicNumber) + "_permiso-gremial_" + sanitize(delegateName) + ".pdf"; }
    private static String sanitize(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
        return normalized.isBlank() ? "documento" : normalized;
    }
    private DocumentException notFound(String code, String message) { return new DocumentException(404, code, message); }
}
