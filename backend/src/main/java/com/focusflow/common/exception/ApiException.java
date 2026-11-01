package com.focusflow.common.exception;

import org.springframework.http.HttpStatus;

/** Erreur metier portant un code stable exploitable par le frontend (propriete "code" du ProblemDetail). */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public static ApiException notFound(String what, Object id) {
        return new ResourceNotFoundException(what, id);
    }

    /** Regle metier violee : requete valide syntaxiquement mais impossible dans l'etat courant. */
    public static ApiException rule(String code, String message) {
        return new BusinessRuleException(code, message);
    }

    /** Conflit d'etat (transition illegale, ressource deja active...). */
    public static ApiException conflict(String code, String message) {
        return new ResourceConflictException(code, message);
    }
}
