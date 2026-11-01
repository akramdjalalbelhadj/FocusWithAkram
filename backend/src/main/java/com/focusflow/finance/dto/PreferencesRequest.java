package com.focusflow.finance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** Preferences financieres ; un plafond ou un objectif absent signifie « non defini ». */
public record PreferencesRequest(
        @NotNull(message = "La reserve de securite est obligatoire (0 si aucune).") BigDecimal safetyReserve,
        @NotNull(message = "Le plancher d'epargne est obligatoire (0 si aucun).") BigDecimal savingsFloor,
        BigDecimal defaultVariableCap,
        BigDecimal defaultSavingsTarget,
        @NotNull(message = "Le seuil d'alerte est obligatoire.") @Min(value = 1, message = "Entre 1 et 100.")
        @Max(value = 100, message = "Entre 1 et 100.") Integer warningPercent) {
}
