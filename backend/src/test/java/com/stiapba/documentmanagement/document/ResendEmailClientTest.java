package com.stiapba.documentmanagement.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ResendEmailClientTest {
    private MockRestServiceServer server;
    private ResendEmailClient client;
    private final DocumentGenerationService.GeneratedDocument document = new DocumentGenerationService.GeneratedDocument(
            new byte[]{1, 2, 3}, UUID.randomUUID(), "PG-2026-000123", "permiso.pdf");

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new ResendEmailClient(builder, new ObjectMapper(), "re_test_key");
    }

    @Test
    void sendsTextAndPdfAttachmentThroughResendApi() {
        server.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(header("Authorization", "Bearer re_test_key"))
                .andExpect(content().json("""
                        {
                          "from": "STIA PBA Zona 6 <documentos@example.com>",
                          "to": ["uno@example.com", "dos@example.com"],
                          "subject": "Asunto",
                          "text": "Mensaje",
                          "attachments": [{"content": "AQID", "filename": "permiso.pdf", "content_type": "application/pdf"}]
                        }
                        """))
                .andRespond(withSuccess("{\"id\":\"email-id\"}", MediaType.APPLICATION_JSON));

        client.send("documentos@example.com", "STIA PBA Zona 6", List.of("uno@example.com", "dos@example.com"),
                "Asunto", "Mensaje", document);

        server.verify();
    }

    @Test
    void exposesResendStatusAndErrorType() {
        server.expect(requestTo("https://api.resend.com/emails"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"name\":\"validation_error\",\"message\":\"invalid\"}"));

        assertThatThrownBy(() -> client.send("documentos@example.com", "STIA PBA Zona 6",
                List.of("uno@example.com"), "Asunto", "Mensaje", document))
                .isInstanceOfSatisfying(ResendEmailClient.ResendDeliveryException.class, error -> {
                    org.assertj.core.api.Assertions.assertThat(error.status()).isEqualTo(422);
                    org.assertj.core.api.Assertions.assertThat(error.type()).isEqualTo("validation_error");
                });
        server.verify();
    }
}
