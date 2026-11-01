package com.focusflow.finance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Hypotheses d'une simulation (rien n'est enregistre) : `salaryDelta` s'ajoute a chaque salaire prevu (negatif pour
 * une baisse) ; `variableReduction` reduit chaque mois les depenses variables anticipees ; `postponements` reporte
 * des objectifs ; `excludedGoalIds` les retire ; `extraPurchase` ajoute un achat a son rang de priorite.
 */
public record SimulationRequest(BigDecimal salaryDelta, BigDecimal variableReduction,
                                List<@Valid Postponement> postponements, List<UUID> excludedGoalIds,
                                @Valid GoalRequest extraPurchase) {

    public record Postponement(@NotNull(message = "L'objectif est obligatoire.") UUID goalId,
                               @NotNull(message = "La date est obligatoire.") LocalDate targetDate) {
    }
}
