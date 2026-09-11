package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.user.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentEmailServiceTest {
    @Mock private DocumentGenerationService documentGenerationService;
    @Mock private ResendEmailClient resendEmailClient;

    private DocumentEmailService service;
    private final UUID recordId = UUID.randomUUID();
    private final UserPrincipal admin = new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false);
    private final DocumentGenerationService.GeneratedDocument document = new DocumentGenerationService.GeneratedDocument(
            new byte[]{1, 2, 3}, recordId, "PG-2026-000123", "pg-2026-000123_permiso-gremial_ana-paz.pdf");

    @BeforeEach
    void setUp() {
        service = new DocumentEmailService(documentGenerationService, resendEmailClient,
                "documentos@stiapba.org.ar", "STIA PBA Zona 6");
        when(resendEmailClient.isConfigured()).thenReturn(true);
        when(documentGenerationService.regenerate(eq(recordId), any())).thenReturn(document);
    }

    @Test
    void sendsRegeneratedPdfToOneRecipient() {
        service.send(recordId, List.of("destinatario@example.com"), "Asunto personalizado", "Mensaje", admin);

        verify(resendEmailClient).send("documentos@stiapba.org.ar", "STIA PBA Zona 6",
                List.of("destinatario@example.com"), "Asunto personalizado", "Mensaje", document);
        verify(documentGenerationService).regenerate(recordId, admin);
    }

    @Test
    void sendsToMultipleRecipients() {
        List<String> recipients = List.of("uno@example.com", "dos@example.com");

        service.send(recordId, recipients, "Asunto", "Mensaje", admin);

        verify(resendEmailClient).send("documentos@stiapba.org.ar", "STIA PBA Zona 6", recipients,
                "Asunto", "Mensaje", document);
    }

    @Test
    void returnsControlledErrorWhenResendFails() {
        doThrow(new ResendEmailClient.ResendDeliveryException(422, "validation_error"))
                .when(resendEmailClient).send(any(), any(), any(), any(), any(), any());

        assertThatThrownBy(() -> service.send(recordId, List.of("destinatario@example.com"), "Asunto", "Mensaje", admin))
                .isInstanceOfSatisfying(DocumentException.class, error -> {
                    assertThat(error.getCode()).isEqualTo("MAIL_DELIVERY_FAILED");
                    assertThat(error.getStatus()).isEqualTo(502);
                });
    }

    @Test
    void reportsConfigurationErrorWithoutAttemptingDelivery() {
        when(resendEmailClient.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> service.send(recordId, List.of("destinatario@example.com"), "Asunto", "Mensaje", admin))
                .isInstanceOfSatisfying(DocumentException.class, error -> assertThat(error.getCode()).isEqualTo("MAIL_NOT_CONFIGURED"));
        verify(resendEmailClient, never()).send(any(), any(), any(), any(), any(), any());
    }

    @Test
    void reportsConfigurationErrorWhenFromIsMissing() {
        DocumentEmailService unconfigured = new DocumentEmailService(documentGenerationService, resendEmailClient, "", "STIA PBA Zona 6");

        assertThatThrownBy(() -> unconfigured.send(recordId, List.of("destinatario@example.com"), "Asunto", "Mensaje", admin))
                .isInstanceOfSatisfying(DocumentException.class, error -> assertThat(error.getCode()).isEqualTo("MAIL_NOT_CONFIGURED"));
        verify(resendEmailClient, never()).send(any(), any(), any(), any(), any(), any());
    }
}
