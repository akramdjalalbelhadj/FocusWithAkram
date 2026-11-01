package com.focusflow.common.exception;

import org.springframework.http.HttpStatus;

/** Requete valide dont l'execution violerait une regle metier. */
public final class BusinessRuleException extends ApiException {
    public BusinessRuleException(String code, String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, code, message);
    }
}
