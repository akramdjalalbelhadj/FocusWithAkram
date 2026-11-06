package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Prevision de tresorerie jusqu'a `horizon`. `capDefined` faux : les depenses variables futures ne sont pas
 * anticipees (aucun plafond) ; `hasIncome` faux : aucun revenu prevu dans l'horizon.
 */
public record ForecastResponse(LocalDate today, LocalDate horizon, BigDecimal startAvailable, BigDecimal startSavings,
                               BigDecimal safetyReserve, BigDecimal savingsFloor, boolean capDefined, boolean hasIncome,
                               List<ForecastPoint> points, ForecastPoint lowest, List<GoalFeasibility> goals) {
}
