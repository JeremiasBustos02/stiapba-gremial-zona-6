package com.stiapba.documentmanagement.document;

import com.stiapba.documentmanagement.common.api.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.mock;

class DocumentEmailControllerTest {
    @Test
    void rejectsInvalidRecipient() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new DocumentController(mock(DocumentGenerationService.class),
                mock(DocumentHistoryService.class), mock(DocumentEmailService.class)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();

        mvc.perform(post("/api/v1/documents/history/{id}/email", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"recipient\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
