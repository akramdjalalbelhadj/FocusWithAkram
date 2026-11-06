package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import java.time.YearMonth;

/** Dernier mois suivi (AAAA-MM) : plus de plafond apres ce mois. */
public record EnvelopeEndRequest(@NotNull(message = "Le dernier mois est obligatoire.") YearMonth lastMonth) {
}
