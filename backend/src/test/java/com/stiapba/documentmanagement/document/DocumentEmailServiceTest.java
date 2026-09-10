package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.user.entity.Role;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class DocumentEmailServiceTest {
    @Mock private DocumentGenerationService documentGenerationService;
    @Mock private ObjectProvider<JavaMailSender> mailSenderProvider;
    @Mock private JavaMailSender mailSender;

    private DocumentEmailService service;
    private final UUID recordId = UUID.randomUUID();
    private final UserPrincipal admin = new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false);

    @BeforeEach
    void setUp() {
        service = new DocumentEmailService(documentGenerationService, mailSenderProvider, "documentos@stiapba.org.ar", "STIA PBA Zona 6");
        lenient().when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        lenient().when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        lenient().when(documentGenerationService.regenerate(eq(recordId), any())).thenReturn(new DocumentGenerationService.GeneratedDocument(
                new byte[]{1, 2, 3}, recordId, "PG-2026-000123", "pg-2026-000123_permiso-gremial_ana-paz.pdf"));
    }

    @Test
    void adminSendsRegeneratedPdfWithDescriptiveAttachment() throws Exception {
        service.send(recordId, "destinatario@example.com", admin);

        ArgumentCaptor<MimeMessage> message = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(message.capture());
        assertThat(message.getValue().getSubject()).isEqualTo("Permiso gremial PG-2026-000123");
        assertThat(message.getValue().getAllRecipients()[0].toString()).isEqualTo("destinatario@example.com");
        java.io.ByteArrayOutputStream rawMessage = new java.io.ByteArrayOutputStream();
        message.getValue().writeTo(rawMessage);
        String emailSource = rawMessage.toString(java.nio.charset.StandardCharsets.UTF_8);
        assertThat(emailSource).contains("filename=pg-2026-000123_permiso-gremial_ana-paz.pdf");
        assertThat(emailSource).contains("Content-Type: application/pdf");
        verify(documentGenerationService).regenerate(recordId, admin);
    }

    @Test
    void delegateCanSendOwnDocument() {
        UserPrincipal delegate = new UserPrincipal(UUID.randomUUID(), Role.DELEGADO, false);
        service.send(recordId, "delegate@example.com", delegate);
        verify(documentGenerationService).regenerate(recordId, delegate);
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void doesNotSendWhenRegenerationRejectsAnotherDelegatesDocument() {
        UserPrincipal delegate = new UserPrincipal(UUID.randomUUID(), Role.DELEGADO, false);
        when(documentGenerationService.regenerate(recordId, delegate))
                .thenThrow(new DocumentException(403, "DOCUMENT_RECORD_FORBIDDEN", "Sin permiso."));

        assertThatThrownBy(() -> service.send(recordId, "delegate@example.com", delegate))
                .isInstanceOfSatisfying(DocumentException.class, error -> assertThat(error.getStatus()).isEqualTo(403));
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void returnsControlledErrorWhenSmtpFails() {
        org.mockito.Mockito.doThrow(new MailSendException("SMTP unavailable")).when(mailSender).send(any(MimeMessage.class));

        assertThatThrownBy(() -> service.send(recordId, "destinatario@example.com", admin))
                .isInstanceOfSatisfying(DocumentException.class, error -> {
                    assertThat(error.getCode()).isEqualTo("MAIL_DELIVERY_FAILED");
                    assertThat(error.getStatus()).isEqualTo(502);
                });
    }

    @Test
    void reportsConfigurationErrorWithoutAttemptingDelivery() {
        DocumentEmailService unconfigured = new DocumentEmailService(documentGenerationService, mailSenderProvider, "", "STIA PBA Zona 6");

        assertThatThrownBy(() -> unconfigured.send(recordId, "destinatario@example.com", admin))
                .isInstanceOfSatisfying(DocumentException.class, error -> assertThat(error.getCode()).isEqualTo("MAIL_NOT_CONFIGURED"));
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void reportsConfigurationErrorWhenJavaMailSenderIsUnavailable() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(null);
        DocumentEmailService unconfigured = new DocumentEmailService(documentGenerationService, mailSenderProvider,
                "documentos@stiapba.org.ar", "STIA PBA Zona 6");

        assertThatThrownBy(() -> unconfigured.send(recordId, "destinatario@example.com", admin))
                .isInstanceOfSatisfying(DocumentException.class, error -> assertThat(error.getCode()).isEqualTo("MAIL_NOT_CONFIGURED"));
        verify(mailSender, never()).send(any(MimeMessage.class));
    }
}
