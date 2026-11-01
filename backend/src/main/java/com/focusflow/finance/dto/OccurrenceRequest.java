package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Montant et date d'une echeance : reels pour la realiser, prevus pour l'ajuster. */
public record OccurrenceRequest(
        @NotNull(message = "Le montant est obligatoire.") BigDecimal amount,
        @NotNull(message = "La date est obligatoire.") LocalDate date) {
}
