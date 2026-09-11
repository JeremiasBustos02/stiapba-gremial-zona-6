package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class DocumentEmailService {
    private static final Logger logger = LoggerFactory.getLogger(DocumentEmailService.class);
    private final DocumentGenerationService documentGenerationService;
    private final ResendEmailClient resendEmailClient;
    private final String from;
    private final String fromName;

    public DocumentEmailService(DocumentGenerationService documentGenerationService,
                                ResendEmailClient resendEmailClient,
                                @Value("${app.mail.from:}") String from,
                                @Value("${app.mail.from-name:STIA PBA Zona 6}") String fromName) {
        this.documentGenerationService = documentGenerationService;
        this.resendEmailClient = resendEmailClient;
        this.from = from;
        this.fromName = fromName;
    }

    public void send(UUID recordId, List<String> recipients, String subject, String message, UserPrincipal principal) {
        DocumentGenerationService.GeneratedDocument document = documentGenerationService.regenerate(recordId, principal);
        if (!resendEmailClient.isConfigured() || from.isBlank()) {
            throw new DocumentException(503, "MAIL_NOT_CONFIGURED", "El envío por correo no está configurado actualmente.");
        }
        try {
            resendEmailClient.send(from, fromName, recipients, subject, message, document);
        } catch (ResendEmailClient.ResendDeliveryException exception) {
            logger.warn("Resend email delivery failed recordId={} status={} type={}", recordId, exception.status(), exception.type());
            throw new DocumentException(502, "MAIL_DELIVERY_FAILED", "No pudimos enviar el correo. Intentá nuevamente.");
        }
    }
}
