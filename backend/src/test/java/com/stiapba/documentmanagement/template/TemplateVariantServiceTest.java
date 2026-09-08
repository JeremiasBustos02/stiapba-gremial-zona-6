package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.repository.TemplateFieldRepository;
import com.stiapba.documentmanagement.template.storage.PdfUploadValidator;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TemplateVariantServiceTest {
    @Mock private TemplateService templateService;
    @Mock private TemplateVariantRepository variantRepository;
    @Mock private TemplateFieldRepository fieldRepository;
    @Mock private TemplateFileStorage fileStorage;
    @Mock private PdfUploadValidator pdfUploadValidator;

    @Test
    void cleansNewFileAndFailsWhenOldFileCannotBeRemoved() throws Exception {
        UUID templateId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        Template template = org.mockito.Mockito.mock(Template.class);
        TemplateVariant variant = org.mockito.Mockito.mock(TemplateVariant.class);
        when(template.getId()).thenReturn(templateId);
        when(variant.getTemplate()).thenReturn(template);
        when(variant.getFileKey()).thenReturn("templates/old.pdf");
        when(templateService.findById(templateId)).thenReturn(template);
        when(variantRepository.findById(variantId)).thenReturn(Optional.of(variant));
        when(pdfUploadValidator.validate(any())).thenReturn("new pdf".getBytes());
        when(fileStorage.store(any())).thenReturn("templates/new.pdf");
        when(variantRepository.saveAndFlush(variant)).thenReturn(variant);
        doThrow(new IOException("storage unavailable")).when(fileStorage).delete("templates/old.pdf");

        TemplateVariantService service = new TemplateVariantService(templateService, variantRepository, fieldRepository, fileStorage, pdfUploadValidator);

        assertThatThrownBy(() -> service.replaceFile(templateId, variantId,
                new MockMultipartFile("archivoPdf", "new.pdf", "application/pdf", "content".getBytes())))
                .isInstanceOf(TemplateException.class)
                .hasMessage("No pudimos retirar el archivo anterior de forma segura.");
        verify(fileStorage).delete("templates/new.pdf");
    }
}
