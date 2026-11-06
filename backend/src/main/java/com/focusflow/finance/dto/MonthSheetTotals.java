package com.focusflow.finance.dto;

import java.math.BigDecimal;

/**
 * Totaux de la feuille du mois (voir docs/produit/mes-achats/feuille-du-mois.md, § 3) :
 * <ul>
 *   <li>revenus et depenses fixes : somme des prevus et des reels des lignes (lignes sautees exclues) ;</li>
 *   <li>{@code variablePlanned} = somme des plafonds, {@code variableActual} = somme des depenses des enveloppes ;</li>
 *   <li>{@code expensesActual} : depenses payees du mois, nettes des remboursements d'achats ;
 *       {@code othersActual} = expensesActual - fixedActual - variableActual ;</li>
 *   <li>{@code expensesPlanned} = fixedPlanned + variablePlanned ; {@code savingsPlanned} = incomePlanned -
 *       expensesPlanned ; {@code savingsActual} = incomeActual - expensesActual.</li>
 * </ul>
 */
public record MonthSheetTotals(BigDecimal incomePlanned, BigDecimal incomeActual, BigDecimal fixedPlanned,
                               BigDecimal fixedActual, BigDecimal variablePlanned, BigDecimal variableActual,
                               BigDecimal othersActual, BigDecimal expensesPlanned, BigDecimal expensesActual,
                               BigDecimal savingsPlanned, BigDecimal savingsActual) {
}
