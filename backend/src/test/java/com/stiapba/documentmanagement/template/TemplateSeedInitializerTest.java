package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateRepository;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.storage.PdfUploadValidator;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.DefaultApplicationArguments;

import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TemplateSeedInitializerTest {
    @TempDir
    Path temporaryDirectory;

    @Test
    void createsTemplateAndVariantUsingTheStoredFileKey() throws Exception {
        TemplateRepository templateRepository = mock(TemplateRepository.class);
        TemplateVariantRepository variantRepository = mock(TemplateVariantRepository.class);
        TemplateFileStorage storage = mock(TemplateFileStorage.class);
        when(templateRepository.findByNombre("Permiso Gremial")).thenReturn(Optional.empty());
        when(storage.store(any())).thenReturn("templates/seed.pdf");
        when(templateRepository.saveAndFlush(any(Template.class))).thenAnswer(invocation -> invocation.getArgument(0));

        initializer(templateRepository, variantRepository, storage).run(new DefaultApplicationArguments());

        verify(variantRepository).saveAndFlush(any(TemplateVariant.class));
        verify(storage).store(any());
    }

    @Test
    void repairsMissingBrunaFileWithoutCreatingAnotherVariant() throws Exception {
        TemplateRepository templateRepository = mock(TemplateRepository.class);
        TemplateVariantRepository variantRepository = mock(TemplateVariantRepository.class);
        TemplateFileStorage storage = mock(TemplateFileStorage.class);
        Template template = new Template("Permiso Gremial", "Permiso gremial estándar");
        TemplateVariant variant = new TemplateVariant(template, "Bruna", "templates/missing.pdf");
        when(templateRepository.findByNombre("Permiso Gremial")).thenReturn(Optional.of(template));
        when(variantRepository.findFirstByTemplate_IdAndNombre(isNull(), eq("Bruna"))).thenReturn(Optional.of(variant));
        when(storage.load("templates/missing.pdf")).thenThrow(new NoSuchFileException("templates/missing.pdf"));
        when(storage.store(any())).thenReturn("templates/repaired.pdf");

        initializer(templateRepository, variantRepository, storage).run(new DefaultApplicationArguments());

        verify(variantRepository).saveAndFlush(variant);
        verify(templateRepository, never()).saveAndFlush(any(Template.class));
        verify(storage).store(any());
    }

    @Test
    void doesNothingWhenBrunaAndItsStoredFileAlreadyExist() throws Exception {
        TemplateRepository templateRepository = mock(TemplateRepository.class);
        TemplateVariantRepository variantRepository = mock(TemplateVariantRepository.class);
        TemplateFileStorage storage = mock(TemplateFileStorage.class);
        Template template = new Template("Permiso Gremial", "Permiso gremial estándar");
        TemplateVariant variant = new TemplateVariant(template, "Bruna", "templates/valid.pdf");
        byte[] source = java.nio.file.Files.readAllBytes(Path.of("..", "docs", "pdf-templates", "Permiso-Gremial-Bruna.pdf"));
        when(templateRepository.findByNombre("Permiso Gremial")).thenReturn(Optional.of(template));
        when(variantRepository.findFirstByTemplate_IdAndNombre(isNull(), eq("Bruna"))).thenReturn(Optional.of(variant));
        when(storage.load("templates/valid.pdf")).thenReturn(source);

        initializer(templateRepository, variantRepository, storage).run(new DefaultApplicationArguments());

        verify(storage, never()).store(any());
        verify(templateRepository, never()).saveAndFlush(any(Template.class));
        verify(variantRepository, never()).saveAndFlush(any(TemplateVariant.class));
    }

    private TemplateSeedInitializer initializer(TemplateRepository templateRepository, TemplateVariantRepository variantRepository,
                                                TemplateFileStorage storage) {
        return new TemplateSeedInitializer(templateRepository, variantRepository, storage, new PdfUploadValidator(10_485_760),
                "../docs/pdf-templates/Permiso-Gremial-Bruna.pdf", true);
    }
}
