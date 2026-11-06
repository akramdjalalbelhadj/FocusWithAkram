package com.focusflow.finance.dto;

import jakarta.validation.constraints.Size;

/** Commentaire d'un mois (explication d'un depassement) ; vide ou absent : supprime. */
public record EnvelopeCommentRequest(@Size(max = 1000, message = "1000 caracteres maximum.") String comment) {
}
