package com.stiapba.documentmanagement.template;

import com.stiapba.documentmanagement.template.TemplateDtos.TemplateVariantResponse;
import com.stiapba.documentmanagement.template.entity.Template;
import com.stiapba.documentmanagement.template.entity.TemplateVariant;
import com.stiapba.documentmanagement.template.repository.TemplateVariantRepository;
import com.stiapba.documentmanagement.template.repository.TemplateFieldRepository;
import com.stiapba.documentmanagement.template.storage.PdfUploadValidator;
import com.stiapba.documentmanagement.template.storage.TemplateFileStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TemplateVariantServiceTest {
    @Mock private TemplateService templateService;
    @Mock private TemplateVariantRepository variantRepository;
    @Mock private TemplateFieldRepository fieldRepository;
    @Mock private TemplateFileStorage fileStorage;
    @Mock private PdfUploadValidator pdfUploadValidator;

    @AfterEach
    void clearTransactionSynchronization() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void deletesOldFileOnlyAfterSuccessfulCommit() throws Exception {
        TransactionSynchronizationManager.initSynchronization();
        Fixture fixture = fixture();

        TemplateVariantService service = service();
        service.replaceFile(fixture.templateId, fixture.variantId, fixture.multipartFile);

        verify(fileStorage, never()).delete("templates/old.pdf");
        synchronization().afterCommit();
        verify(fileStorage).delete("templates/old.pdf");
        synchronization().afterCompletion(TransactionSynchronization.STATUS_COMMITTED);
        verify(fileStorage, never()).delete("templates/new.pdf");
    }

    @Test
    void cleansNewFileAfterTransactionRollbackWithoutDeletingOldFile() throws Exception {
        TransactionSynchronizationManager.initSynchronization();
        Fixture fixture = fixture();

        service().replaceFile(fixture.templateId, fixture.variantId, fixture.multipartFile);
        synchronization().afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(fileStorage).delete("templates/new.pdf");
        verify(fileStorage, never()).delete("templates/old.pdf");
    }

    @Test
    void keepsConfirmedDatabaseChangeWhenOldFileCleanupFails() throws Exception {
        TransactionSynchronizationManager.initSynchronization();
        Fixture fixture = fixture();
        doThrow(new IOException("storage unavailable")).when(fileStorage).delete("templates/old.pdf");

        TemplateVariantResponse response = service().replaceFile(fixture.templateId, fixture.variantId, fixture.multipartFile);

        assertThat(response).isNotNull();
        synchronization().afterCommit();
        verify(fileStorage).delete("templates/old.pdf");
        verify(fileStorage, never()).delete("templates/new.pdf");
    }

    @Test
    void preservesDatabaseFailureWhenNewFileCleanupAlsoFails() throws Exception {
        Fixture fixture = fixture();
        RuntimeException databaseFailure = new IllegalStateException("database unavailable");
        when(variantRepository.saveAndFlush(fixture.variant)).thenThrow(databaseFailure);
        doThrow(new IOException("cleanup unavailable")).when(fileStorage).delete("templates/new.pdf");

        assertThatThrownBy(() -> service().replaceFile(fixture.templateId, fixture.variantId, fixture.multipartFile))
                .isSameAs(databaseFailure);
        verify(fileStorage).delete("templates/new.pdf");
        verify(fileStorage, never()).delete("templates/old.pdf");
    }

    private TemplateVariantService service() {
        return new TemplateVariantService(templateService, variantRepository, fieldRepository, fileStorage, pdfUploadValidator);
    }

    private TransactionSynchronization synchronization() {
        return TransactionSynchronizationManager.getSynchronizations().get(0);
    }

    private Fixture fixture() throws IOException {
        UUID templateId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        Template template = org.mockito.Mockito.mock(Template.class);
        TemplateVariant variant = org.mockito.Mockito.mock(TemplateVariant.class);
        when(template.getId()).thenReturn(templateId);
        lenient().when(variant.getId()).thenReturn(variantId);
        when(variant.getTemplate()).thenReturn(template);
        lenient().when(variant.getNombre()).thenReturn("Firma");
        when(variant.getFileKey()).thenReturn("templates/old.pdf");
        lenient().when(variant.isActive()).thenReturn(true);
        lenient().when(variant.isLegacyPositioned()).thenReturn(false);
        lenient().when(variant.getCreatedAt()).thenReturn(OffsetDateTime.now());
        lenient().when(variant.getUpdatedAt()).thenReturn(OffsetDateTime.now());
        when(templateService.findById(templateId)).thenReturn(template);
        when(variantRepository.findById(variantId)).thenReturn(Optional.of(variant));
        when(pdfUploadValidator.validate(any())).thenReturn("new pdf".getBytes());
        when(fileStorage.store(any())).thenReturn("templates/new.pdf");
        when(variantRepository.saveAndFlush(variant)).thenReturn(variant);
        return new Fixture(templateId, variantId, variant,
                new MockMultipartFile("archivoPdf", "new.pdf", "application/pdf", "content".getBytes()));
    }

    private record Fixture(UUID templateId, UUID variantId, TemplateVariant variant,
                           MockMultipartFile multipartFile) {
    }
}
