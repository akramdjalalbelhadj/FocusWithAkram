package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.YearMonth;

/** Changement de montant « a partir de ce mois » (echeancier ou plafond d'une enveloppe). */
public record AmountChange(
        @NotNull(message = "Le mois est obligatoire.") YearMonth fromMonth,
        @NotNull(message = "Le montant est obligatoire.") BigDecimal amount) {
}
