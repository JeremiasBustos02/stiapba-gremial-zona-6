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
        TemplateVariant variant = activeVariant(request.variantId());
        if (variant.getFields().isEmpty()) {
            return generateLegacy(toPermisoRequest(request), variant, principal);
        }
        return generateConfigured(request, variant, principal);
    }

    private DocumentGenerationService.GeneratedDocument generateLegacy(PermisoGremialRequest permiso, TemplateVariant variant,
                                                                        UserPrincipal principal) {
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

    private DocumentGenerationService.GeneratedDocument generateConfigured(DocumentGenerationRequest request, TemplateVariant variant,
                                                                            UserPrincipal principal) {
        Map<String, String> baseValues = request.baseValues() == null ? Map.of() : request.baseValues();
        Map<String, String> values = new LinkedHashMap<>();
        List<TemplateField> fields = variant.getFields();
        Province province = hasSource(fields, FieldSourceType.PROVINCE) ? province(baseValues, "provinceId", hasRequiredSource(fields, FieldSourceType.PROVINCE)) : null;
        Company company = hasSource(fields, FieldSourceType.COMPANY) ? company(baseValues, "companyId", hasRequiredSource(fields, FieldSourceType.COMPANY)) : null;
        User delegate = hasSource(fields, FieldSourceType.DELEGATE) ? delegate(baseValues, "delegateId", hasRequiredSource(fields, FieldSourceType.DELEGATE)) : null;
        Agreement agreement = hasSource(fields, FieldSourceType.AGREEMENT) ? agreement(baseValues, "agreementId", hasRequiredSource(fields, FieldSourceType.AGREEMENT)) : null;
        LocalDate issueDate = requiresIssueDate(fields) ? date(baseValues, "issueDate", hasRequiredDerivedField(fields, false)) : null;
        Integer permitDay = requiresPermitDay(fields) ? integer(baseValues, "permitDay", hasRequiredDerivedField(fields, true)) : null;
        if (issueDate != null && issueDate.isAfter(LocalDate.now())) throw new DocumentException(400, "INVALID_ISSUE_DATE", "La fecha de emisión no puede ser futura.");
        if (permitDay != null && (permitDay < 1 || permitDay > 31)) throw new DocumentException(400, "INVALID_PERMIT_DAY", "El día de permiso debe estar entre 1 y 31.");

        for (TemplateField field : fields) {
            FieldDefinition definition = field.getFieldDefinition();
            String value = switch (definition.getSourceType()) {
                case PROVINCE -> province == null ? null : province.getName();
                case COMPANY -> company == null ? null : company.getNombre();
                case DELEGATE -> delegate == null ? null : delegateValue(definition.getKey(), delegate);
                case AGREEMENT -> agreement == null ? null : agreementValue(definition.getKey(), agreement);
                case DERIVED -> derivedValue(definition.getKey(), issueDate, permitDay);
                case MANUAL -> null;
            };
            if (value != null) values.put(definition.getKey(), value);
        }
        addManualValues(variant, request.manualValues(), values);
        byte[] pdf = render(variant, values);
        User createdBy = userRepository.findById(principal.id()).filter(User::isActive)
                .orElseThrow(() -> new DocumentException(401, "SESSION_INVALID", "La sesión no es válida o expiró."));
        String delegateName = delegate == null ? "Documento" : delegate.getNombre() + " " + delegate.getApellido();
        LocalDate recordIssueDate = issueDate == null ? LocalDate.now() : issueDate;
        String companyName = company == null ? "" : company.getNombre();
        String publicNumber = documentNumberService.nextPermisoGremialNumber();
        DocumentRecord record = documentRecordRepository.save(new DocumentRecord(publicNumber, documentType(), createdBy.getId(),
                createdBy.getNombre() + " " + createdBy.getApellido(), variant.getTemplate().getId(), variant.getId(), recordIssueDate,
                companyName, delegateName, values));
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
        TemplateVariant variant = activeVariant(variantId);
        return variant.getFields().stream().filter(field -> field.getFieldDefinition().getSourceType() == FieldSourceType.MANUAL)
                .collect(java.util.stream.Collectors.toMap(field -> field.getFieldDefinition().getId(), this::manualFieldResponse,
                        (first, second) -> new DocumentGenerationService.ManualFieldResponse(first.id(), first.label(), first.type(), first.required() || second.required()), LinkedHashMap::new))
                .values().stream().toList();
    }

    @Override
    @Transactional
    public List<DocumentGenerationService.GenerationFieldResponse> generationFields(UUID variantId) {
        return activeVariant(variantId).getFields().stream().map(this::generationFieldResponse).toList();
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

    private UUID requiredUuid(Map<String, String> values, String key) {
        try { return UUID.fromString(required(values, key)); }
        catch (IllegalArgumentException exception) { throw invalidBaseValue(); }
    }
    private UUID uuid(Map<String, String> values, String key, boolean required) {
        String value = values.get(key);
        if (value == null || value.isBlank()) {
            if (required) throw invalidBaseValue();
            return null;
        }
        try { return UUID.fromString(value); }
        catch (IllegalArgumentException exception) { throw invalidBaseValue(); }
    }
    private LocalDate requiredDate(Map<String, String> values, String key) {
        try { return LocalDate.parse(required(values, key)); }
        catch (RuntimeException exception) { throw invalidBaseValue(); }
    }
    private Integer requiredInteger(Map<String, String> values, String key) {
        try { return Integer.valueOf(required(values, key)); }
        catch (RuntimeException exception) { throw invalidBaseValue(); }
    }
    private LocalDate date(Map<String, String> values, String key, boolean required) {
        String value = values.get(key);
        if (value == null || value.isBlank()) {
            if (required) throw invalidBaseValue();
            return null;
        }
        try { return LocalDate.parse(value); }
        catch (RuntimeException exception) { throw invalidBaseValue(); }
    }
    private Integer integer(Map<String, String> values, String key, boolean required) {
        String value = values.get(key);
        if (value == null || value.isBlank()) {
            if (required) throw invalidBaseValue();
            return null;
        }
        try { return Integer.valueOf(value); }
        catch (RuntimeException exception) { throw invalidBaseValue(); }
    }
    private String required(Map<String, String> values, String key) {
        String value = values.get(key);
        if (value == null || value.isBlank()) throw new IllegalArgumentException(key);
        return value;
    }
    private DocumentException invalidBaseValue() { return new DocumentException(400, "DOCUMENT_BASE_VALUE_INVALID", "Los datos base del documento no tienen el formato esperado."); }

    private TemplateVariant activeVariant(UUID variantId) {
        TemplateVariant variant = variantRepository.findById(variantId)
                .filter(value -> value.isActive() && value.getTemplate().isActive())
                .orElseThrow(() -> notFound("TEMPLATE_VARIANT_NOT_FOUND", "No encontramos una variante activa de Permiso Gremial."));
        if (variant.getTemplate().getDocumentType() != documentType()) {
            throw new DocumentException(422, "TEMPLATE_DOCUMENT_TYPE_UNSUPPORTED", "La plantilla seleccionada no corresponde a Permiso Gremial.");
        }
        return variant;
    }

    private Province province(UUID id) { return provinceRepository.findById(id).filter(Province::isActive).orElseThrow(() -> notFound("PROVINCE_NOT_FOUND", "No encontramos una provincia activa.")); }
    private Province province(Map<String, String> values, String key, boolean required) { UUID id = uuid(values, key, required); return id == null ? null : province(id); }
    private Company company(UUID id) { return companyRepository.findById(id).filter(Company::isActive).orElseThrow(() -> notFound("COMPANY_NOT_FOUND", "No encontramos una empresa activa.")); }
    private Company company(Map<String, String> values, String key, boolean required) { UUID id = uuid(values, key, required); return id == null ? null : company(id); }
    private User delegate(UUID id) { return userRepository.findById(id).filter(user -> user.isActive() && user.getRole() == Role.DELEGADO).orElseThrow(() -> notFound("DELEGATE_NOT_FOUND", "No encontramos un delegado activo.")); }
    private User delegate(Map<String, String> values, String key, boolean required) { UUID id = uuid(values, key, required); return id == null ? null : delegate(id); }
    private Agreement agreement(UUID id) {
        Agreement agreement = agreementRepository.findById(id).filter(Agreement::isActive).orElseThrow(() -> notFound("AGREEMENT_NOT_FOUND", "No encontramos un convenio activo."));
        if (agreement.getCodigo() == null || agreement.getCodigo().isBlank()) throw new DocumentException(422, "AGREEMENT_CODE_REQUIRED", "El convenio seleccionado no tiene código para imprimir.");
        return agreement;
    }
    private Agreement agreement(Map<String, String> values, String key, boolean required) { UUID id = uuid(values, key, required); return id == null ? null : agreement(id); }
    private boolean hasSource(List<TemplateField> fields, FieldSourceType source) { return fields.stream().anyMatch(field -> field.getFieldDefinition().getSourceType() == source); }
    private boolean hasRequiredSource(List<TemplateField> fields, FieldSourceType source) { return fields.stream().anyMatch(field -> field.getFieldDefinition().getSourceType() == source && field.isRequired()); }
    private boolean requiresIssueDate(List<TemplateField> fields) { return fields.stream().anyMatch(field -> field.getFieldDefinition().getSourceType() == FieldSourceType.DERIVED && !field.getFieldDefinition().getKey().equals("permitDay")); }
    private boolean requiresPermitDay(List<TemplateField> fields) { return fields.stream().anyMatch(field -> field.getFieldDefinition().getSourceType() == FieldSourceType.DERIVED && field.getFieldDefinition().getKey().equals("permitDay")); }
    private boolean hasRequiredDerivedField(List<TemplateField> fields, boolean permitDay) { return fields.stream().anyMatch(field -> field.getFieldDefinition().getSourceType() == FieldSourceType.DERIVED && field.getFieldDefinition().getKey().equals("permitDay") == permitDay && field.isRequired()); }
    private String delegateValue(String key, User delegate) { return key.equals("delegateDni") ? delegate.getDni() : delegate.getNombre() + " " + delegate.getApellido() + " DNI " + delegate.getDni(); }
    private String agreementValue(String key, Agreement agreement) { return agreement.getCodigo().trim(); }
    private String derivedValue(String key, LocalDate issueDate, Integer permitDay) {
        return switch (key) {
            case "issueDay" -> issueDate == null ? null : Integer.toString(issueDate.getDayOfMonth());
            case "issueMonth" -> issueDate == null ? null : issueDate.getMonth().getDisplayName(TextStyle.FULL, Locale.forLanguageTag("es-AR"));
            case "issueYear" -> issueDate == null ? null : String.format("%02d", issueDate.getYear() % 100);
            case "permitDay" -> permitDay == null ? null : Integer.toString(permitDay);
            default -> null;
        };
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

    private DocumentGenerationService.GenerationFieldResponse generationFieldResponse(TemplateField field) {
        FieldDefinition definition = field.getFieldDefinition();
        String inputKey = switch (definition.getSourceType()) {
            case MANUAL -> "manualValues." + definition.getId();
            case PROVINCE -> "baseValues.provinceId";
            case COMPANY -> "baseValues.companyId";
            case DELEGATE -> "baseValues.delegateId";
            case AGREEMENT -> "baseValues.agreementId";
            case DERIVED -> definition.getKey().equals("permitDay") ? "baseValues.permitDay" : "baseValues.issueDate";
        };
        return new DocumentGenerationService.GenerationFieldResponse(definition.getId(), definition.getKey(), definition.getLabel(),
                definition.getType(), definition.getSourceType(), field.isRequired(), field.getDisplayOrder(), inputKey);
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
