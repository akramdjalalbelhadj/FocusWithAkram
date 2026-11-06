package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Montant et date d'une echeance : reels pour la realiser, prevus pour l'ajuster. Le commentaire facultatif
 * (salaire plus bas apres une absence, facture exceptionnelle) est conserve dans la description de l'operation.
 */
public record OccurrenceRequest(
        @NotNull(message = "Le montant est obligatoire.") BigDecimal amount,
        @NotNull(message = "La date est obligatoire.") LocalDate date,
        @Size(max = 1000, message = "1000 caracteres maximum.") String comment) {
}
