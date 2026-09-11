package com.stiapba.documentmanagement.document;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.io.IOException;
import java.util.Base64;
import java.util.List;

@Service
public class ResendEmailClient {
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public ResendEmailClient(RestClient.Builder restClientBuilder, ObjectMapper objectMapper,
                             @Value("${app.resend.api-key:}") String apiKey) {
        this.restClient = restClientBuilder.baseUrl("https://api.resend.com").build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
    }

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    public void send(String from, String fromName, List<String> recipients, String subject, String text,
                     DocumentGenerationService.GeneratedDocument document) {
        String sender = fromName.isBlank() ? from : fromName + " <" + from + ">";
        ResendRequest request = new ResendRequest(sender, recipients, subject, text,
                List.of(new ResendAttachment(Base64.getEncoder().encodeToString(document.content()),
                        document.filename(), "application/pdf")));
        try {
            restClient.post()
                    .uri("/emails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(request)
                    .exchange((ignoredRequest, response) -> {
                        if (response.getStatusCode().isError()) {
                            throw new ResendDeliveryException(response.getStatusCode().value(), readErrorType(response));
                        }
                        return null;
                    });
        } catch (ResendDeliveryException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            throw new ResendDeliveryException(exception.getStatusCode().value(), errorType(exception.getResponseBodyAsString()));
        } catch (RestClientException exception) {
            throw new ResendDeliveryException(0, "transport_error");
        }
    }

    private String readErrorType(org.springframework.http.client.ClientHttpResponse response) {
        try {
            return errorType(new String(response.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
        } catch (IOException exception) {
            return "unknown_error";
        }
    }

    private String errorType(String body) {
        try {
            JsonNode error = objectMapper.readTree(body);
            String name = error.path("name").asText();
            return name.isBlank() ? "unknown_error" : name;
        } catch (IOException exception) {
            return "unknown_error";
        }
    }

    private record ResendRequest(String from, List<String> to, String subject, String text,
                                 List<ResendAttachment> attachments) {
    }

    private record ResendAttachment(String content, String filename,
                                    @JsonProperty("content_type") String contentType) {
    }

    public static final class ResendDeliveryException extends RuntimeException {
        private final int status;
        private final String type;

        public ResendDeliveryException(int status, String type) {
            this.status = status;
            this.type = type;
        }

        public int status() {
            return status;
        }

        public String type() {
            return type;
        }
    }
}
