package com.focusflow.finance.dto;

import java.math.BigDecimal;

/**
 * Bilan d'un mois. Les depenses sont nettes des remboursements d'achats ; les virements, soldes initiaux et
 * corrections n'y figurent pas.
 * <ul>
 *   <li>{@code incomeExpected} : revenus du mois, prevus ou recus (au montant prevu), echeances comprises ;</li>
 *   <li>{@code expensesPlanned} = {@code essentialPlanned} + {@code variablePlanned} : depenses encore prevues ;</li>
 *   <li>{@code goalPurchasesPaid} : achats d'objectifs, comptes dans les depenses mais hors plafond variable ;</li>
 *   <li>{@code savedToSavings} : virements nets vers les comptes d'epargne (epargne mise de cote) ;</li>
 *   <li>{@code unspent} : revenus recus - depenses payees - epargne mise de cote.</li>
 * </ul>
 */
public record MonthTotals(BigDecimal incomeExpected, BigDecimal incomeReceived, BigDecimal expensesPaid,
                          BigDecimal essentialPaid, BigDecimal variablePaid, BigDecimal exceptionalPaid,
                          BigDecimal refunds, BigDecimal expensesPlanned, BigDecimal essentialPlanned,
                          BigDecimal variablePlanned, BigDecimal goalPurchasesPaid, BigDecimal savedToSavings,
                          BigDecimal unspent) {
}
