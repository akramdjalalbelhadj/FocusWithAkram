package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/**
 * Budget d'un mois et son suivi. Les montants « prevus » incluent les echeances calculees non encore realisees.
 * <ul>
 *   <li>{@code capSource} : ENVELOPES (somme des plafonds des depenses variables plafonnees actives ce mois-ci),
 *       MONTH (saisi pour ce mois), DEFAULT (preferences) ou NONE ;</li>
 *   <li>{@code savingsTargetSource} : MONTH (saisi pour ce mois), DEFAULT (preferences) ou NONE ;</li>
 *   <li>{@code state} : NONE (pas de plafond), OK, WARNING (seuil atteint) ou OVER (plafond depasse) ;</li>
 *   <li>{@code theoreticalSavings} : revenus attendus - indispensables attendues - plafond variable (null sans plafond).</li>
 * </ul>
 */
public record BudgetResponse(YearMonth month, BigDecimal variableCap, String capSource, BigDecimal savingsTarget,
                             String savingsTargetSource, int warningPercent, MonthTotals totals,
                             BigDecimal essentialExpected, BigDecimal variableRemaining, Integer variableUsedPercent,
                             String state, BigDecimal theoreticalSavings, List<OperationResponse> incomes,
                             List<OperationResponse> essentials, List<OperationResponse> plannedVariable) {
}
