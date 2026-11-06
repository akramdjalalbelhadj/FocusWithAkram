package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Total depense du mois pour une depense variable plafonnee. `comment` : absent, le commentaire du mois est
 * inchange ; vide, il est supprime.
 */
public record EnvelopeActualRequest(
        @NotNull(message = "Le montant est obligatoire.") BigDecimal amount,
        @Size(max = 1000, message = "1000 caracteres maximum.") String comment) {
}
