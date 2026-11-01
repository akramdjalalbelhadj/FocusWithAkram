package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Remboursement, total ou partiel, recu (pret accorde) ou verse (emprunt). */
public record RepaymentRequest(
        @NotNull(message = "Le montant est obligatoire.") BigDecimal amount,
        @NotNull(message = "La date est obligatoire.") LocalDate date,
        @NotNull(message = "Le compte est obligatoire.") UUID accountId) {
}
