package com.stiapba.documentmanagement.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(
        int status,
        String code,
        String message,
        Map<String, String> errors,
        OffsetDateTime timestamp
) {
}
