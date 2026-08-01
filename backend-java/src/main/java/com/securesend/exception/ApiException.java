package com.securesend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final Object details;

    public ApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
        this.details = null;
    }

    public ApiException(String message, HttpStatus status, Object details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}
