package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.common.api.GlobalExceptionHandler;
import com.stiapba.documentmanagement.document.DocumentHistoryDtos.SendDocumentEmailRequest;
import com.stiapba.documentmanagement.document.DocumentHistoryDtos.SendDocumentEmailResponse;
import com.stiapba.documentmanagement.security.UserPrincipal;
import com.stiapba.documentmanagement.user.entity.Role;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.doNothing;

class DocumentEmailControllerTest {
    @Test
    void rejectsInvalidRecipientWithoutCreatingSingularRecipientError() throws Exception {
        DocumentEmailService emailService = mock(DocumentEmailService.class);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new DocumentController(mock(DocumentGenerationService.class),
                mock(DocumentHistoryService.class), emailService))
                .setControllerAdvice(new GlobalExceptionHandler()).build();

        mvc.perform(post("/api/v1/documents/history/{id}/email", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipients\":[\"not-an-email\"],\"subject\":\"Asunto\",\"message\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors['recipients[0]']").exists())
                .andExpect(jsonPath("$.errors.recipient").doesNotExist());
    }

    @Test
    void rejectsEmptyRecipientsAndSubjectUsingPluralFieldName() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new DocumentController(mock(DocumentGenerationService.class),
                mock(DocumentHistoryService.class), mock(DocumentEmailService.class)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();

        mvc.perform(post("/api/v1/documents/history/{id}/email", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipients\":[],\"subject\":\" \",\"message\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.recipients").exists())
                .andExpect(jsonPath("$.errors.recipient").doesNotExist());
    }

    @Test
    void acceptsTheNewEmailRequestContract() throws Exception {
        DocumentEmailService emailService = mock(DocumentEmailService.class);
        UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), Role.ADMIN, false);
        doNothing().when(emailService).send(any(), any(), any(), any(), eq(principal));
        SendDocumentEmailRequest request = new SendDocumentEmailRequest(
                java.util.List.of("jeremias.e.bustos@gmail.com"),
                "Permiso Gremial PG-2026-000011",
                "Adjuntamos el Permiso Gremial correspondiente.");
        org.assertj.core.api.Assertions.assertThat(Validation.buildDefaultValidatorFactory().getValidator().validate(request)).isEmpty();

        SendDocumentEmailResponse response = new DocumentController(mock(DocumentGenerationService.class),
                mock(DocumentHistoryService.class), emailService)
                .sendByEmail(UUID.randomUUID(), request, principal);

        verify(emailService).send(any(), eq(java.util.List.of("jeremias.e.bustos@gmail.com")),
                eq("Permiso Gremial PG-2026-000011"), eq("Adjuntamos el Permiso Gremial correspondiente."), eq(principal));
        org.assertj.core.api.Assertions.assertThat(response.message()).isEqualTo("Correo enviado correctamente.");
    }
}
