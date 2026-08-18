package com.stiapba.documentmanagement.template;

import java.util.Map;

public class TemplateException extends RuntimeException {
    private final int status;
    private final String code;
    private final Map<String, String> errors;

    public TemplateException(int status, String code, String message) {
        this(status, code, message, null);
    }

    public TemplateException(int status, String code, String message, Map<String, String> errors) {
        super(message);
        this.status = status;
        this.code = code;
        this.errors = errors;
    }

    public int getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public Map<String, String> getErrors() {
        return errors;
    }
}
