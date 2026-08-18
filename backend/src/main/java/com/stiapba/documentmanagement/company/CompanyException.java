package com.stiapba.documentmanagement.company;

public class CompanyException extends RuntimeException {
    private final int status;
    private final String code;

    public CompanyException(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public int getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
