package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.UUID;

/** Nouvelle depense variable plafonnee : categorie suivie, libelle (par defaut le nom de la categorie), plafond. */
public record EnvelopeRequest(
        @NotNull(message = "La categorie est obligatoire.") UUID categoryId,
        @Size(max = 120, message = "120 caracteres maximum.") String label,
        @NotNull(message = "Le plafond est obligatoire.") BigDecimal amount,
        @NotNull(message = "Le premier mois est obligatoire.") YearMonth fromMonth) {
}
