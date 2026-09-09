package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import com.stiapba.documentmanagement.template.entity.TemplateField;
import com.stiapba.documentmanagement.template.entity.TemplateFieldAlignment;
import com.stiapba.documentmanagement.template.entity.TemplateFieldMode;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.FieldDefinitionRepository;
import com.stiapba.documentmanagement.template.repository.TemplateFieldRepository;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;
import org.apache.pdfbox.pdmodel.interactive.form.PDTextField;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class TemplateFieldService {
    private final TemplateVariantRepository variantRepository;
    private final TemplateFieldRepository fieldRepository;
    private final FieldDefinitionRepository definitionRepository;
    private final TemplateFileStorage fileStorage;

    public TemplateFieldService(TemplateVariantRepository variantRepository, TemplateFieldRepository fieldRepository,
                                FieldDefinitionRepository definitionRepository, TemplateFileStorage fileStorage) {
        this.variantRepository = variantRepository;
        this.fieldRepository = fieldRepository;
        this.definitionRepository = definitionRepository;
        this.fileStorage = fileStorage;
    }

    @Transactional(readOnly = true)
    public List<TemplateFieldResponse> list(UUID templateId, UUID variantId) {
        findVariant(templateId, variantId);
        return fieldRepository.findByTemplateVariant_IdOrderByDisplayOrderAsc(variantId).stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public List<AcroformFieldResponse> acroformFields(UUID templateId, UUID variantId) {
        TemplateVariant variant = findVariant(templateId, variantId);
        try (PDDocument document = Loader.loadPDF(fileStorage.load(variant.getFileKey()))) {
            if (document.getDocumentCatalog().getAcroForm() == null) {
                return List.of();
            }
            List<AcroformFieldResponse> fields = new ArrayList<>();
            for (PDField field : document.getDocumentCatalog().getAcroForm().getFieldTree()) {
                if (field instanceof PDTextField) {
                    PDAnnotationWidget widget = field.getWidgets().isEmpty() ? null : field.getWidgets().getFirst();
                    int pageNumber = widget == null ? 0 : pageNumber(document, widget);
                    PDRectangle rectangle = widget == null ? null : widget.getRectangle();
                    String technicalName = field.getFullyQualifiedName();
                    fields.add(new AcroformFieldResponse(technicalName, displayName(field), field.getPartialName(),
                            field.getAlternateFieldName(), field.getMappingName(), pageNumber,
                            rectangle == null ? null : rectangle.getLowerLeftX(), rectangle == null ? null : rectangle.getLowerLeftY(),
                            rectangle == null ? null : rectangle.getWidth(), rectangle == null ? null : rectangle.getHeight()));
                }
            }
            return fields;
        } catch (IOException exception) {
            throw new TemplateException(422, "TEMPLATE_FILE_NOT_FOUND", "No pudimos leer el archivo de la plantilla.");
        }
    }

    @Transactional
    public TemplateFieldResponse create(UUID templateId, UUID variantId, PositionedFieldRequest request) {
        TemplateVariant variant = findVariant(templateId, variantId);
        TemplateField field = new TemplateField(variant, definition(request.fieldDefinitionId()),
                com.stiapba.documentmanagement.template.entity.TemplateFieldMode.POSITIONED, null, request.required(), request.displayOrder());
        apply(field, variant, request);
        return response(fieldRepository.save(field));
    }

    @Transactional
    public TemplateFieldResponse createAcroform(UUID templateId, UUID variantId, AcroformFieldRequest request) {
        TemplateVariant variant = findVariant(templateId, variantId);
        validateAcroformField(variant, request.acroFieldName());
        boolean alreadyMapped = fieldRepository.findByTemplateVariant_IdOrderByDisplayOrderAsc(variantId).stream()
                .anyMatch(field -> field.getMode() == com.stiapba.documentmanagement.template.entity.TemplateFieldMode.ACROFORM
                        && request.acroFieldName().equals(field.getAcroFieldName()));
        if (alreadyMapped) {
            throw new TemplateException(409, "ACROFORM_FIELD_ALREADY_CONFIGURED", "El campo AcroForm ya está configurado para esta variante.");
        }
        TemplateField field = new TemplateField(variant, definition(request.fieldDefinitionId()),
                com.stiapba.documentmanagement.template.entity.TemplateFieldMode.ACROFORM, request.acroFieldName(),
                request.required(), request.displayOrder());
        return response(fieldRepository.save(field));
    }

    @Transactional
    public TemplateFieldResponse update(UUID templateId, UUID variantId, UUID fieldId, PositionedFieldRequest request) {
        TemplateVariant variant = findVariant(templateId, variantId);
        TemplateField field = fieldRepository.findById(fieldId).filter(value -> value.getTemplateVariant().getId().equals(variant.getId()) && value.getMode() == com.stiapba.documentmanagement.template.entity.TemplateFieldMode.POSITIONED)
                .orElseThrow(() -> new TemplateException(404, "TEMPLATE_FIELD_NOT_FOUND", "No encontramos el campo configurado."));
        apply(field, variant, request);
        return response(field);
    }

    @Transactional
    public void delete(UUID templateId, UUID variantId, UUID fieldId) {
        findVariant(templateId, variantId);
        TemplateField field = fieldRepository.findById(fieldId).filter(value -> value.getTemplateVariant().getId().equals(variantId) && value.getMode() == com.stiapba.documentmanagement.template.entity.TemplateFieldMode.POSITIONED)
                .orElseThrow(() -> new TemplateException(404, "TEMPLATE_FIELD_NOT_FOUND", "No encontramos el campo configurado."));
        fieldRepository.delete(field);
    }

    @Transactional
    public List<TemplateFieldResponse> replaceAll(UUID templateId, UUID variantId, FieldsConfigurationRequest request) {
        TemplateVariant variant = findVariant(templateId, variantId);
        List<ConfiguredField> configuredFields = request.fields() == null ? List.of() : request.fields();
        List<TemplateField> fields = new ArrayList<>();
        Set<String> acroformNames = new HashSet<>();
        for (int index = 0; index < configuredFields.size(); index++) {
            ConfiguredField configured = configuredFields.get(index);
            TemplateFieldMode mode = mode(configured.mode());
            FieldDefinition definition = definition(configured.fieldDefinitionId());
            int displayOrder = configured.displayOrder() == null ? index : configured.displayOrder();
            if (mode == TemplateFieldMode.ACROFORM) {
                validateAcroformField(variant, configured.acroFieldName());
                if (!acroformNames.add(configured.acroFieldName())) {
                    throw new TemplateException(400, "ACROFORM_FIELD_DUPLICATED", "Un campo del documento solo puede configurarse una vez.");
                }
                fields.add(new TemplateField(variant, definition, mode, configured.acroFieldName(), configured.required(), displayOrder));
                continue;
            }
            PositionedFieldRequest positioned = new PositionedFieldRequest(definition.getId(), configured.required(), displayOrder,
                    required(configured.pageNumber(), "La página es obligatoria."), required(configured.x(), "La posición horizontal es obligatoria."),
                    required(configured.y(), "La posición vertical es obligatoria."), required(configured.width(), "El ancho es obligatorio."),
                    required(configured.height(), "El alto es obligatorio."), required(configured.fontSize(), "El tamaño de fuente es obligatorio."),
                    required(configured.minFontSize(), "El tamaño mínimo de fuente es obligatorio."), required(configured.maxFontSize(), "El tamaño máximo de fuente es obligatorio."),
                    alignment(configured.alignment()), Boolean.TRUE.equals(configured.multiline()));
            TemplateField field = new TemplateField(variant, definition, mode, null, configured.required(), displayOrder);
            apply(field, variant, positioned);
            fields.add(field);
        }
        fieldRepository.deleteByTemplateVariant_Id(variantId);
        fieldRepository.flush();
        return fieldRepository.saveAll(fields).stream().map(this::response).toList();
    }

    private void apply(TemplateField field, TemplateVariant variant, PositionedFieldRequest request) {
        validateRectangle(variant, request);
        if (request.alignment() == null || request.minFontSize() > request.fontSize() || request.fontSize() > request.maxFontSize()) {
            throw new TemplateException(400, "POSITIONED_FIELD_INVALID", "El tamaño de fuente debe estar entre el mínimo y el máximo.");
        }
        field.updatePositioned(definition(request.fieldDefinitionId()), request.required(), request.displayOrder(), request.pageNumber(),
                request.x(), request.y(), request.width(), request.height(), request.fontSize(), request.minFontSize(),
                request.maxFontSize(), request.alignment(), request.multiline());
    }

    private TemplateFieldMode mode(String value) {
        try {
            return TemplateFieldMode.valueOf(value);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new TemplateException(400, "TEMPLATE_FIELD_MODE_INVALID", "El tipo de campo no es válido.");
        }
    }

    private TemplateFieldAlignment alignment(String value) {
        try {
            return TemplateFieldAlignment.valueOf(value);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new TemplateException(400, "POSITIONED_FIELD_INVALID", "La alineación del campo no es válida.");
        }
    }

    private int required(Integer value, String message) {
        if (value == null) throw new TemplateException(400, "POSITIONED_FIELD_INVALID", message);
        return value;
    }

    private float required(Float value, String message) {
        if (value == null) throw new TemplateException(400, "POSITIONED_FIELD_INVALID", message);
        return value;
    }

    private void validateRectangle(TemplateVariant variant, PositionedFieldRequest request) {
        if (request.pageNumber() < 1 || request.x() < 0 || request.y() < 0 || request.width() <= 0 || request.height() <= 0) {
            throw new TemplateException(400, "POSITIONED_FIELD_INVALID", "La posición y el tamaño del campo no son válidos.");
        }
        try (PDDocument document = Loader.loadPDF(fileStorage.load(variant.getFileKey()))) {
            if (request.pageNumber() > document.getNumberOfPages()) throw new TemplateException(400, "POSITIONED_FIELD_OUT_OF_PAGE", "La página seleccionada no existe.");
            PDRectangle page = document.getPage(request.pageNumber() - 1).getMediaBox();
            if (request.x() + request.width() > page.getWidth() || request.y() + request.height() > page.getHeight()) {
                throw new TemplateException(400, "POSITIONED_FIELD_OUT_OF_PAGE", "El campo debe quedar dentro de la página PDF.");
            }
        } catch (IOException exception) {
            throw new TemplateException(422, "TEMPLATE_FILE_UNAVAILABLE", "No pudimos leer el archivo de la plantilla.");
        }
    }

    private void validateAcroformField(TemplateVariant variant, String fieldName) {
        if (fieldName == null || fieldName.isBlank()) {
            throw new TemplateException(400, "ACROFORM_FIELD_INVALID", "El nombre del campo AcroForm es obligatorio.");
        }
        try (PDDocument document = Loader.loadPDF(fileStorage.load(variant.getFileKey()))) {
            PDField field = document.getDocumentCatalog().getAcroForm() == null ? null
                    : document.getDocumentCatalog().getAcroForm().getField(fieldName);
            if (!(field instanceof PDTextField)) {
                throw new TemplateException(422, "ACROFORM_FIELD_NOT_FOUND", "La plantilla no contiene el campo AcroForm seleccionado.");
            }
        } catch (IOException exception) {
            throw new TemplateException(422, "TEMPLATE_FILE_NOT_FOUND", "No pudimos leer el archivo de la plantilla.");
        }
    }

    private int pageNumber(PDDocument document, PDAnnotationWidget widget) throws IOException {
        for (int index = 0; index < document.getNumberOfPages(); index++) {
            if (document.getPage(index).getAnnotations().contains(widget)) {
                return index + 1;
            }
        }
        return 0;
    }

    private String displayName(PDField field) {
        String technicalName = field.getFullyQualifiedName();
        if (!technicalName.matches("TextFormField\\s+\\d+")) {
            return technicalName;
        }
        if (field.getAlternateFieldName() != null && !field.getAlternateFieldName().isBlank()) {
            return field.getAlternateFieldName();
        }
        if (field.getMappingName() != null && !field.getMappingName().isBlank()) {
            return field.getMappingName();
        }
        return technicalName;
    }

    private TemplateVariant findVariant(UUID templateId, UUID variantId) {
        return variantRepository.findById(variantId).filter(value -> value.getTemplate().getId().equals(templateId))
                .orElseThrow(() -> new TemplateException(404, "TEMPLATE_VARIANT_NOT_FOUND", "No encontramos la variante solicitada."));
    }

    private FieldDefinition definition(UUID id) {
        return definitionRepository.findById(id).orElseThrow(() -> new TemplateException(404, "FIELD_DEFINITION_NOT_FOUND", "No encontramos la definición de campo."));
    }

    private TemplateFieldResponse response(TemplateField field) {
        return new TemplateFieldResponse(field.getId(), field.getFieldDefinition().getId(), field.getFieldDefinition().getKey(), field.getFieldDefinition().getLabel(), field.getMode().name(), field.getAcroFieldName(), field.isRequired(), field.getDisplayOrder(), field.getPageNumber(), field.getX(), field.getY(), field.getWidth(), field.getHeight(), field.getFontSize(), field.getMinFontSize(), field.getMaxFontSize(), field.getAlignment() == null ? null : field.getAlignment().name(), field.getMultiline());
    }

    public record PositionedFieldRequest(UUID fieldDefinitionId, boolean required, int displayOrder, int pageNumber, float x, float y, float width, float height, float fontSize, float minFontSize, float maxFontSize, TemplateFieldAlignment alignment, boolean multiline) {}
    public record AcroformFieldRequest(UUID fieldDefinitionId, String acroFieldName, boolean required, int displayOrder) {}
    public record FieldsConfigurationRequest(List<ConfiguredField> fields) {}
    public record ConfiguredField(UUID fieldDefinitionId, String mode, String acroFieldName, boolean required, Integer displayOrder,
                                  Integer pageNumber, Float x, Float y, Float width, Float height, Float fontSize,
                                  Float minFontSize, Float maxFontSize, String alignment, Boolean multiline) {}
    public record AcroformFieldResponse(String acroFieldName, String displayName, String partialName, String alternateFieldName,
                                        String mappingName, int pageNumber, Float x, Float y, Float width, Float height) {}
    public record TemplateFieldResponse(UUID id, UUID fieldDefinitionId, String fieldKey, String fieldLabel, String mode, String acroFieldName, boolean required, int displayOrder, Integer pageNumber, Float x, Float y, Float width, Float height, Float fontSize, Float minFontSize, Float maxFontSize, String alignment, Boolean multiline) {}
}
