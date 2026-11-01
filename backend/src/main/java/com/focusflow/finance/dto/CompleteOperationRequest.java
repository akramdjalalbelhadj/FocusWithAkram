package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Realisation d'une operation prevue : montant et date reels (le montant prevu est conserve). */
public record CompleteOperationRequest(
        @NotNull(message = "Le montant reel est obligatoire.") BigDecimal amount,
        @NotNull(message = "La date reelle est obligatoire.") LocalDate date) {
}
