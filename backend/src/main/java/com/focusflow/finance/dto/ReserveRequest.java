package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** Montant total reserve pour l'objectif (0 pour liberer la reservation). */
public record ReserveRequest(@NotNull(message = "Le montant est obligatoire.") BigDecimal amount) {
}
