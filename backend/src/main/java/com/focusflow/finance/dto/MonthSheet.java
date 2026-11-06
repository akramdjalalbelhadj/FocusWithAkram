package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * Feuille d'un mois : prevu et reel par section. Une echeance appartient au mois de sa date d'echeance, toute autre
 * operation au mois de sa date. `period` : PAST, CURRENT ou FUTURE par rapport au mois d'aujourd'hui ; `account` :
 * compte unique avec son solde (absent tant que le solde de depart n'est pas saisi) ; `others` : depenses realisees
 * hors depenses fixes et hors enveloppes (achats d'objectifs compris, remboursements deduits), de la plus recente a la
 * plus ancienne ; `savingsTarget` : objectif d'epargne du mois (valeur du mois ou par defaut).
 */
public record MonthSheet(YearMonth month, LocalDate today, String period, AccountResponse account,
                         List<SheetRow> incomes, List<SheetRow> fixed, List<EnvelopeRow> variable,
                         List<OperationResponse> others, MonthSheetTotals totals, BigDecimal savingsTarget) {
}
