package com.focusflow.common.exception;

import org.springframework.http.HttpStatus;

/** La ressource demandee n'existe pas. */
public final class ResourceNotFoundException extends ApiException {
    public ResourceNotFoundException(String resource, Object id) {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", resource + " introuvable : " + id);
    }
}
