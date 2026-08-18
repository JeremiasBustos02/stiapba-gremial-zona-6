package com.stiapba.documentmanagement.user;

public class UserException extends RuntimeException {

    private final int status;
    private final String code;

    public UserException(int status, String code, String message) {
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
