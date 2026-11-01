package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * Vue d'ensemble : soldes reels du jour et bilan du mois demande. `upcoming` liste les operations prevues
 * en retard puis celles des 30 prochains jours, echeances calculees comprises ; `budget` est la jauge du plafond variable.
 */
public record FinanceOverview(YearMonth month, LocalDate today, List<AccountResponse> accounts,
                              BigDecimal availableBalance, BigDecimal savingsBalance, MonthTotals totals,
                              List<CategoryTotal> byCategory, List<OperationResponse> upcoming, int overdueCount,
                              BudgetGauge budget, BigDecimal safetyReserve) {
}
