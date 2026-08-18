package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateRepository;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.storage.PdfUploadValidator;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
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
                                   @Value("${app.template.seed-file:../docs/pdf-templates/Permiso-Gremial-Bruna.pdf}") String seedFile,
                                   @Value("${app.template.seed-enabled:true}") boolean enabled) {
        this.templateRepository = templateRepository;
        this.variantRepository = variantRepository;
        this.fileStorage = fileStorage;
        this.pdfUploadValidator = pdfUploadValidator;
        this.seedFile = seedFile;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled || templateRepository.findByNombre("Permiso Gremial").isPresent()) {
            return;
        }
        Path source = Path.of(seedFile).toAbsolutePath().normalize();
        if (!Files.isRegularFile(source)) {
            logger.warn("No se pudo provisionar Permiso Gremial: no existe {}", source);
            return;
        }
        try {
            byte[] content = Files.readAllBytes(source);
            pdfUploadValidator.validateBytes(content);
            Template template = templateRepository.saveAndFlush(new Template("Permiso Gremial", "Permiso gremial estándar"));
            String fileKey = fileStorage.store(content);
            try {
                variantRepository.saveAndFlush(new TemplateVariant(template, "Bruna", fileKey));
            } catch (RuntimeException exception) {
                fileStorage.delete(fileKey);
                throw exception;
            }
            logger.info("Se provisionó la plantilla inicial Permiso Gremial / Bruna.");
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo provisionar la plantilla inicial.", exception);
        }
    }
}
