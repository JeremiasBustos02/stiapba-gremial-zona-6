package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.security.UserPrincipal;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
public class DocumentEmailService {
    private static final Logger logger = LoggerFactory.getLogger(DocumentEmailService.class);
    private final DocumentGenerationService documentGenerationService;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String from;
    private final String fromName;

    public DocumentEmailService(DocumentGenerationService documentGenerationService,
                                ObjectProvider<JavaMailSender> mailSenderProvider,
                                @Value("${app.mail.from:}") String from,
                                @Value("${app.mail.from-name:STIA PBA Zona 6}") String fromName) {
        this.documentGenerationService = documentGenerationService;
        this.mailSenderProvider = mailSenderProvider;
        this.from = from;
        this.fromName = fromName;
    }

    public void send(UUID recordId, String recipient, UserPrincipal principal) {
        long regenerationStart = System.nanoTime();
        DocumentGenerationService.GeneratedDocument document = documentGenerationService.regenerate(recordId, principal);
        logger.info("Email timing recordId={} pdfRegenerationMs={}", recordId, elapsedMillis(regenerationStart));
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null || from.isBlank()) {
            throw new DocumentException(503, "MAIL_NOT_CONFIGURED", "El envío por correo no está configurado actualmente.");
        }
        try {
            long messageStart = System.nanoTime();
            var message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(from, fromName, StandardCharsets.UTF_8.name()));
            helper.setTo(recipient.trim());
            helper.setSubject("Permiso gremial " + document.publicNumber());
            helper.setText("Hola,\n\nAdjuntamos el documento " + document.publicNumber()
                    + " correspondiente al permiso gremial.\n\nSaludos,\nSTIA PBA Zona 6", false);
            helper.addAttachment(document.filename(), new ByteArrayResource(document.content()), "application/pdf");
            logger.info("Email timing recordId={} mimeMessageBuildMs={}", recordId, elapsedMillis(messageStart));
            long sendStart = System.nanoTime();
            mailSender.send(message);
            logger.info("Email timing recordId={} smtpSendMs={}", recordId, elapsedMillis(sendStart));
        } catch (MailException | MessagingException | UnsupportedEncodingException exception) {
            throw new DocumentException(502, "MAIL_DELIVERY_FAILED", "No pudimos enviar el correo. Intentá nuevamente.");
        }
    }

    private long elapsedMillis(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000;
    }
}
