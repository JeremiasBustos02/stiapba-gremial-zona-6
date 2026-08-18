package com.stiapba.documentmanagement.common.api;

import com.stiapba.documentmanagement.auth.AuthException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError error : exception.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(error.getField(), error.getDefaultMessage());
        }
        return error(400, "VALIDATION_ERROR", "Los datos enviados contienen errores.", errors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException exception) {
        return error(400, "VALIDATION_ERROR", "Los datos enviados contienen errores.", Map.of());
    }

    @ExceptionHandler(AuthException.class)
    ResponseEntity<ApiError> handleAuth(AuthException exception) {
        return error(exception.getStatus(), exception.getCode(), exception.getMessage(), exception.getErrors());
    }

    private ResponseEntity<ApiError> error(int status, String code, String message, Map<String, String> errors) {
        return ResponseEntity.status(status).body(new ApiError(status, code, message, errors, OffsetDateTime.now()));
    }
}
