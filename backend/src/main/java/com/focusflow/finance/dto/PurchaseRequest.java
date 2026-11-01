package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Achat reel d'un objectif : prix et date reels, compte debite ; categorie de l'objectif par defaut. */
public record PurchaseRequest(
        @NotNull(message = "Le prix reel est obligatoire.") BigDecimal amount,
        @NotNull(message = "La date d'achat est obligatoire.") LocalDate date,
        @NotNull(message = "Le compte est obligatoire.") UUID accountId,
        UUID categoryId,
        String label) {
}
