package com.focusflow.common.exception;

import org.springframework.http.HttpStatus;

/** L'etat courant de la ressource empeche l'operation. */
public final class ResourceConflictException extends ApiException {
    public ResourceConflictException(String code, String message) {
        super(HttpStatus.CONFLICT, code, message);
    }
}
