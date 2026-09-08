package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.TemplateDtos.TemplateVariantResponse;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.repository.TemplateFieldRepository;
import com.stiapba.documentmanagement.template.storage.PdfUploadValidator;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
public class TemplateVariantService {
    private final TemplateService templateService;
    private final TemplateVariantRepository variantRepository;
    private final TemplateFieldRepository fieldRepository;
    private final TemplateFileStorage fileStorage;
    private final PdfUploadValidator pdfUploadValidator;

    public TemplateVariantService(TemplateService templateService, TemplateVariantRepository variantRepository, TemplateFieldRepository fieldRepository,
                                  TemplateFileStorage fileStorage, PdfUploadValidator pdfUploadValidator) {
        this.templateService = templateService;
        this.variantRepository = variantRepository;
        this.fieldRepository = fieldRepository;
        this.fileStorage = fileStorage;
        this.pdfUploadValidator = pdfUploadValidator;
    }

    public List<TemplateVariantResponse> list(UUID templateId, String search, Boolean active, boolean admin) {
        Template template = templateService.findById(templateId);
        if (!admin && !template.isActive()) {
            throw new TemplateException(404, "TEMPLATE_NOT_FOUND", "No encontramos la plantilla solicitada.");
        }
        Specification<TemplateVariant> specification = (root, query, builder) ->
                builder.equal(root.get("template").get("id"), templateId);
        if (!admin || Boolean.TRUE.equals(active)) {
            specification = specification.and((root, query, builder) -> builder.isTrue(root.get("active")));
        } else if (Boolean.FALSE.equals(active)) {
            specification = specification.and((root, query, builder) -> builder.isFalse(root.get("active")));
        }
        if (search != null && !search.isBlank()) {
            String value = search.trim().toLowerCase();
            specification = specification.and((root, query, builder) ->
                    builder.like(builder.lower(root.get("nombre")), "%" + value + "%"));
        }
        return variantRepository.findAll(specification, Sort.by("nombre").ascending()).stream().map(this::toResponse).toList();
    }

    @Transactional
    public TemplateVariantResponse create(UUID templateId, String nombre, MultipartFile file) {
        Template template = templateService.findById(templateId);
        String normalizedName = validateName(nombre);
        byte[] content = pdfUploadValidator.validate(file);
        String fileKey = store(content);
        try {
            TemplateVariant variant = variantRepository.saveAndFlush(new TemplateVariant(template, normalizedName, fileKey));
            return toResponse(variant);
        } catch (RuntimeException exception) {
            deleteQuietly(fileKey);
            throw exception;
        }
    }

    @Transactional
    public TemplateVariantResponse update(UUID templateId, UUID variantId, String nombre) {
        TemplateVariant variant = findVariant(templateId, variantId);
        variant.updateNombre(validateName(nombre));
        return toResponse(variantRepository.save(variant));
    }

    @Transactional
    public TemplateVariantResponse replaceFile(UUID templateId, UUID variantId, MultipartFile file) {
        TemplateVariant variant = findVariant(templateId, variantId);
        byte[] content = pdfUploadValidator.validate(file);
        String oldFileKey = variant.getFileKey();
        String newFileKey = store(content);
        try {
            variant.updateFileKey(newFileKey);
            TemplateVariant saved = variantRepository.saveAndFlush(variant);
            fieldRepository.deleteByTemplateVariant_Id(variantId);
            try {
                fileStorage.delete(oldFileKey);
            } catch (IOException | RuntimeException exception) {
                throw storageFailure("No pudimos retirar el archivo anterior de forma segura.", exception);
            }
            return toResponse(saved);
        } catch (RuntimeException exception) {
            deleteQuietly(newFileKey);
            throw exception;
        }
    }

    @Transactional
    public void activate(UUID templateId, UUID variantId) {
        findVariant(templateId, variantId).activate();
    }

    @Transactional
    public void deactivate(UUID templateId, UUID variantId) {
        findVariant(templateId, variantId).deactivate();
    }

    public byte[] loadFile(UUID templateId, UUID variantId) {
        TemplateVariant variant = findVariant(templateId, variantId);
        try {
            return fileStorage.load(variant.getFileKey());
        } catch (IOException exception) {
            throw new TemplateException(422, "TEMPLATE_FILE_UNAVAILABLE", "No pudimos leer el archivo de la plantilla.");
        }
    }

    private TemplateVariant findVariant(UUID templateId, UUID variantId) {
        templateService.findById(templateId);
        return variantRepository.findById(variantId)
                .filter(variant -> variant.getTemplate().getId().equals(templateId))
                .orElseThrow(() -> new TemplateException(404, "TEMPLATE_VARIANT_NOT_FOUND", "No encontramos la variante solicitada."));
    }

    private String validateName(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            throw new TemplateException(400, "VALIDATION_ERROR", "El nombre de la variante es obligatorio.");
        }
        String value = nombre.trim();
        if (value.length() > 200) {
            throw new TemplateException(400, "VALIDATION_ERROR", "El nombre de la variante es demasiado largo.");
        }
        return value;
    }

    private String store(byte[] content) {
        try {
            return fileStorage.store(content);
        } catch (IOException | RuntimeException exception) {
            throw storageFailure("No pudimos guardar el archivo PDF.", exception);
        }
    }

    private void deleteQuietly(String fileKey) {
        try {
            fileStorage.delete(fileKey);
        } catch (IOException | RuntimeException ignored) {
            // The original reference remains authoritative when cleanup cannot complete.
        }
    }

    private TemplateException storageFailure(String message, Exception cause) {
        return new TemplateException(500, "TEMPLATE_FILE_STORAGE_ERROR", message);
    }

    private TemplateVariantResponse toResponse(TemplateVariant variant) {
        return new TemplateVariantResponse(variant.getId(), variant.getTemplate().getId(), variant.getNombre(), variant.isActive(), variant.isLegacyPositioned(),
                variant.getCreatedAt(), variant.getUpdatedAt());
    }
}
