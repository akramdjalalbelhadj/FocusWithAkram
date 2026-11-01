package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** Solde reellement constate : l'ecart avec le solde calcule devient une operation de correction. */
public record ReconcileRequest(
        @NotNull(message = "Le solde constate est obligatoire.") BigDecimal actualBalance,
        @Size(max = 500, message = "500 caracteres maximum.") String note) {
}
