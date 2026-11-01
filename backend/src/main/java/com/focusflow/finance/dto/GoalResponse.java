package com.focusflow.finance.dto;

import com.focusflow.finance.GoalStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Objectif d'achat. `quadrant` derive d'important et urgent. Pour un objectif achete, `purchasedAmount` et
 * `purchasedDate` viennent de la depense reelle liee ; `feasibility` n'existe que pour un objectif ouvert.
 */
public record GoalResponse(UUID id, String name, CategoryRef category, String description, BigDecimal estimatedPrice,
                           BigDecimal maxPrice, LocalDate targetDate, boolean important, boolean urgent, String quadrant,
                           GoalStatus status, BigDecimal reservedAmount, boolean fundedBySavings, int position,
                           String notes, BigDecimal purchasedAmount, LocalDate purchasedDate, UUID purchaseOperationId,
                           GoalFeasibility feasibility, Instant createdAt) {
}
