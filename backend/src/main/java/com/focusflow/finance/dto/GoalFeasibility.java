package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Faisabilite d'un objectif, calculee par la prevision (voir ForecastEngine). `verdict` : FEASIBLE, RISKY,
 * NOT_FEASIBLE ou UNKNOWN (donnees insuffisantes). `monthlyEffort` : epargne supplementaire par mois qui rendrait
 * l'achat realisable a la date cible. `notes` : NO_ACCOUNT, NO_INCOME, NO_CAP, TARGET_PASSED, LATE_INCOME.
 */
public record GoalFeasibility(UUID goalId, String verdict, LocalDate evaluatedDate, LocalDate feasibleDate,
                              LocalDate retainedDate, BigDecimal need, BigDecimal reserved, BigDecimal remainingToFund,
                              BigDecimal availableAtDate, BigDecimal lowestAfterPurchase, BigDecimal margin,
                              BigDecimal fromSavings, BigDecimal affordableAtDate, BigDecimal monthlyEffort,
                              boolean dependsOnLateIncome, List<String> notes) {
}
