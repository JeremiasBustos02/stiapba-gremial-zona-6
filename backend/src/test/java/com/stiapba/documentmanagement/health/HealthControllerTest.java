package com.stiapba.documentmanagement.health;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class HealthControllerTest {

    private final MockMvc mockMvc = standaloneSetup(new HealthController()).build();

    @Test
    void returnsMinimalInMemoryHealthResponse() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"status\":\"UP\"}"));
    }

    @Test
    void returnsEmptySuccessfulHeadResponse() throws Exception {
        mockMvc.perform(head("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(content().string(""));
    }
}
