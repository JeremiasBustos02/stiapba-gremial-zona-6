package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.FieldDefinition;
import com.stiapba.documentmanagement.template.entity.TemplateField;
import com.stiapba.documentmanagement.template.entity.TemplateFieldMode;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.FieldDefinitionRepository;
import com.stiapba.documentmanagement.template.repository.TemplateRepository;
import com.stiapba.documentmanagement.template.repository.TemplateFieldRepository;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.storage.PdfUploadValidator;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;

@Component
public class TemplateSeedInitializer implements ApplicationRunner {
    private static final Logger logger = LoggerFactory.getLogger(TemplateSeedInitializer.class);
    private final TemplateRepository templateRepository;
    private final TemplateVariantRepository variantRepository;
    private final FieldDefinitionRepository fieldDefinitionRepository;
    private final TemplateFieldRepository templateFieldRepository;
    private final TemplateFileStorage fileStorage;
    private final PdfUploadValidator pdfUploadValidator;
    private final String seedFile;
    private final String acroformSeedFile;
    private final boolean enabled;

    public TemplateSeedInitializer(TemplateRepository templateRepository, TemplateVariantRepository variantRepository,
                                   FieldDefinitionRepository fieldDefinitionRepository, TemplateFieldRepository templateFieldRepository,
                                   TemplateFileStorage fileStorage, PdfUploadValidator pdfUploadValidator,
                                   @Value("${app.template.seed-file:}") String seedFile,
                                   @Value("${app.template.acroform-seed-file:}") String acroformSeedFile,
                                   @Value("${app.template.seed-enabled:true}") boolean enabled) {
        this.templateRepository = templateRepository;
        this.variantRepository = variantRepository;
        this.fieldDefinitionRepository = fieldDefinitionRepository;
        this.templateFieldRepository = templateFieldRepository;
        this.fileStorage = fileStorage;
        this.pdfUploadValidator = pdfUploadValidator;
        this.seedFile = seedFile;
        this.acroformSeedFile = acroformSeedFile;
        this.enabled = enabled;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        try {
            Template template = templateRepository.findByNombre("Permiso Gremial").orElse(null);
            if (template != null) {
                TemplateVariant variant = variantRepository.findFirstByTemplate_IdAndNombre(template.getId(), "Bruna").orElse(null);
                if (variant != null && hasStoredFile(variant.getFileKey())) {
                    seedAcroformVariant(template);
                    return;
                }
                repairVariant(template, variant);
                seedAcroformVariant(template);
                return;
            }
            template = createTemplateAndVariant();
            seedAcroformVariant(template);
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo provisionar la plantilla inicial.", exception);
        }
    }

    private boolean hasStoredFile(String fileKey) throws IOException {
        try {
            pdfUploadValidator.validateBytes(fileStorage.load(fileKey));
            return true;
        } catch (NoSuchFileException exception) {
            return false;
        }
    }

    private Template createTemplateAndVariant() throws IOException {
        String fileKey = fileStorage.store(loadSeedContent());
        try {
            Template template = templateRepository.saveAndFlush(new Template("Permiso Gremial", "Permiso gremial estándar"));
            TemplateVariant variant = new TemplateVariant(template, "Bruna", fileKey);
            variant.markLegacyPositioned();
            variantRepository.saveAndFlush(variant);
            logger.info("Se provisionó la plantilla inicial Permiso Gremial / Bruna.");
            return template;
        } catch (RuntimeException exception) {
            fileStorage.delete(fileKey);
            throw exception;
        }
    }

    private void seedAcroformVariant(Template template) throws IOException {
        if (acroformSeedFile == null || acroformSeedFile.isBlank()) {
            return;
        }
        TemplateVariant variant = variantRepository.findFirstByTemplate_IdAndNombre(template.getId(), "Bruna AcroForm").orElse(null);
        if (variant == null) {
            String fileKey = fileStorage.store(loadSeedContent(acroformSeedFile));
            try {
                variant = variantRepository.saveAndFlush(new TemplateVariant(template, "Bruna AcroForm", fileKey));
                logger.info("Se provisionó la variante Permiso Gremial / Bruna AcroForm.");
            } catch (RuntimeException exception) {
                fileStorage.delete(fileKey);
                throw exception;
            }
        }
        if (variant.getFields().isEmpty()) {
            createAcroformFields(variant);
        }
    }

    private void createAcroformFields(TemplateVariant variant) {
        addAcroformField(variant, "province", "Provincia", 1);
        addAcroformField(variant, "issueDay", "Dia fecha", 2);
        addAcroformField(variant, "issueMonth", "Mes", 3);
        addAcroformField(variant, "issueYear", "Año", 4);
        addAcroformField(variant, "company", "Empresa", 5);
        addAcroformField(variant, "delegate", "Delegado y DNI", 6);
        addAcroformField(variant, "permitDay", "Dia permiso", 7);
        addAcroformField(variant, "agreement", "Convenio", 8);
    }

    private void addAcroformField(TemplateVariant variant, String key, String acroFieldName, int displayOrder) {
        FieldDefinition definition = fieldDefinitionRepository.findByKey(key)
                .orElseThrow(() -> new IllegalStateException("No existe la definición de campo " + key + "."));
        templateFieldRepository.save(new TemplateField(variant, definition, TemplateFieldMode.ACROFORM,
                acroFieldName, true, displayOrder));
    }

    private void repairVariant(Template template, TemplateVariant variant) throws IOException {
        String fileKey = fileStorage.store(loadSeedContent());
        try {
            if (variant == null) {
                TemplateVariant created = new TemplateVariant(template, "Bruna", fileKey);
                created.markLegacyPositioned();
                variantRepository.saveAndFlush(created);
                logger.info("Se provisionó la variante inicial Bruna.");
            } else {
                variant.updateFileKey(fileKey);
                variantRepository.saveAndFlush(variant);
                logger.info("Se reparó el archivo faltante de la variante inicial Bruna.");
            }
        } catch (RuntimeException exception) {
            fileStorage.delete(fileKey);
            throw exception;
        }
    }

    private byte[] loadSeedContent() throws IOException {
        if (seedFile == null || seedFile.isBlank()) {
            throw new IllegalStateException("TEMPLATE_SEED_FILE debe configurarse cuando TEMPLATE_SEED_ENABLED=true.");
        }
        Path source = Path.of(seedFile).toAbsolutePath().normalize();
        if (!Files.isRegularFile(source)) {
            throw new NoSuchFileException(source.toString());
        }
        byte[] content = Files.readAllBytes(source);
        pdfUploadValidator.validateBytes(content);
        return content;
    }

    private byte[] loadSeedContent(String file) throws IOException {
        Path source = Path.of(file).toAbsolutePath().normalize();
        if (!Files.isRegularFile(source)) {
            throw new NoSuchFileException(source.toString());
        }
        byte[] content = Files.readAllBytes(source);
        pdfUploadValidator.validateBytes(content);
        return content;
    }
}
