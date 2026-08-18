package com.stiapba.documentmanagement.user;

import com.stiapba.documentmanagement.common.api.ApiError;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.Map;

@RestControllerAdvice
public class UserExceptionHandler {

    @ExceptionHandler(UserException.class)
    ResponseEntity<ApiError> handle(UserException exception) {
        return ResponseEntity.status(exception.getStatus()).body(new ApiError(
                exception.getStatus(), exception.getCode(), exception.getMessage(), Map.of(), OffsetDateTime.now()));
    }
}
