package com.stiapba.documentmanagement.common.api;

import com.stiapba.documentmanagement.auth.AuthException;
import com.stiapba.documentmanagement.agreement.AgreementException;
import com.stiapba.documentmanagement.company.CompanyException;
import com.stiapba.documentmanagement.template.TemplateException;
import com.stiapba.documentmanagement.document.DocumentException;
import com.stiapba.documentmanagement.user.UserException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

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

    @ExceptionHandler(UserException.class)
    ResponseEntity<ApiError> handleUser(UserException exception) {
        return error(exception.getStatus(), exception.getCode(), exception.getMessage(), null);
    }

    @ExceptionHandler(CompanyException.class)
    ResponseEntity<ApiError> handleCompany(CompanyException exception) {
        return error(exception.getStatus(), exception.getCode(), exception.getMessage(), null);
    }

    @ExceptionHandler(AgreementException.class)
    ResponseEntity<ApiError> handleAgreement(AgreementException exception) {
        return error(exception.getStatus(), exception.getCode(), exception.getMessage(), null);
    }

    @ExceptionHandler(TemplateException.class)
    ResponseEntity<ApiError> handleTemplate(TemplateException exception) {
        return error(exception.getStatus(), exception.getCode(), exception.getMessage(), exception.getErrors());
    }

    @ExceptionHandler(DocumentException.class)
    ResponseEntity<ApiError> handleDocument(DocumentException exception) {
        return error(exception.getStatus(), exception.getCode(), exception.getMessage(), null);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> handleMaxUpload(MaxUploadSizeExceededException exception) {
        return error(413, "PDF_TOO_LARGE", "El archivo PDF supera el tamaño máximo permitido.", null);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    ResponseEntity<ApiError> handleMissingPart(MissingServletRequestPartException exception) {
        return error(400, "VALIDATION_ERROR", "El archivo PDF es obligatorio.", Map.of("archivoPdf", "El archivo PDF es obligatorio."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> handleUnreadableMessage(HttpMessageNotReadableException exception) {
        return error(400, "INVALID_REQUEST", "La solicitud no tiene un formato válido.", null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return error(400, "INVALID_REQUEST", "Uno de los parámetros enviados no es válido.", null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException exception) {
        return error(409, "DATA_CONFLICT", "No se pudo completar la operación porque entra en conflicto con datos existentes.", null);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception exception) {
        logger.error("Error no controlado al procesar una solicitud.", exception);
        return error(500, "INTERNAL_ERROR", "Ocurrió un error inesperado. Intentá nuevamente.", null);
    }

    private ResponseEntity<ApiError> error(int status, String code, String message, Map<String, String> errors) {
        return ResponseEntity.status(status).body(new ApiError(status, code, message, errors, OffsetDateTime.now()));
    }
}
