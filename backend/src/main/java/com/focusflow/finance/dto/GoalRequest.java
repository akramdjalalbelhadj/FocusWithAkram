package com.focusflow.finance.dto;

import com.focusflow.finance.GoalStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Creation ou remplacement complet d'un objectif d'achat (statut : envisage ou planifie). */
public record GoalRequest(
        @NotBlank(message = "Le nom est obligatoire.") @Size(max = 120, message = "120 caracteres maximum.") String name,
        UUID categoryId,
        @Size(max = 2000, message = "2000 caracteres maximum.") String description,
        @NotNull(message = "Le prix estime est obligatoire.") BigDecimal estimatedPrice,
        BigDecimal maxPrice,
        @NotNull(message = "La date cible est obligatoire.") LocalDate targetDate,
        Boolean important,
        Boolean urgent,
        GoalStatus status,
        Boolean fundedBySavings,
        @Size(max = 2000, message = "2000 caracteres maximum.") String notes) {
}
