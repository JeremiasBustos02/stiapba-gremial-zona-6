package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateRepository;
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
    private final TemplateFileStorage fileStorage;
    private final PdfUploadValidator pdfUploadValidator;
    private final String seedFile;
    private final boolean enabled;

    public TemplateSeedInitializer(TemplateRepository templateRepository, TemplateVariantRepository variantRepository,
                                   TemplateFileStorage fileStorage, PdfUploadValidator pdfUploadValidator,
                                    @Value("${app.template.seed-file:}") String seedFile,
                                   @Value("${app.template.seed-enabled:true}") boolean enabled) {
        this.templateRepository = templateRepository;
        this.variantRepository = variantRepository;
        this.fileStorage = fileStorage;
        this.pdfUploadValidator = pdfUploadValidator;
        this.seedFile = seedFile;
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
                    return;
                }
                repairVariant(template, variant);
                return;
            }
            createTemplateAndVariant();
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

    private void createTemplateAndVariant() throws IOException {
        String fileKey = fileStorage.store(loadSeedContent());
        try {
            Template template = templateRepository.saveAndFlush(new Template("Permiso Gremial", "Permiso gremial estándar"));
            variantRepository.saveAndFlush(new TemplateVariant(template, "Bruna", fileKey));
            logger.info("Se provisionó la plantilla inicial Permiso Gremial / Bruna.");
        } catch (RuntimeException exception) {
            fileStorage.delete(fileKey);
            throw exception;
        }
    }

    private void repairVariant(Template template, TemplateVariant variant) throws IOException {
        String fileKey = fileStorage.store(loadSeedContent());
        try {
            if (variant == null) {
                variantRepository.saveAndFlush(new TemplateVariant(template, "Bruna", fileKey));
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
}
