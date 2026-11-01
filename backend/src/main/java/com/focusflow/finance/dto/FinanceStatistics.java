package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

/**
 * Statistiques d'une periode de mois complets, calculees sur les operations realisees. Les depenses sont nettes des
 * remboursements d'achats ; prets, virements et corrections n'y figurent pas.
 */
public record FinanceStatistics(YearMonth from, YearMonth to, List<MonthStat> months, Totals totals,
                                List<CategoryStat> categories, List<OperationResponse> topExpenses,
                                List<PurchaseStat> purchases, BigDecimal writtenOffLent, BigDecimal writtenOffBorrowed) {

    public record MonthStat(YearMonth month, BigDecimal incomeReceived, BigDecimal expensesPaid,
                            BigDecimal essentialPaid, BigDecimal variablePaid, BigDecimal goalPurchasesPaid,
                            BigDecimal savedToSavings, BigDecimal unspent) {
    }

    /**
     * Totaux de la periode. Moyennes : par mois de la periode. `savingsRate` : epargne mise de cote / revenus recus,
     * en pourcentage arrondi (absent sans revenu).
     */
    public record Totals(BigDecimal incomeReceived, BigDecimal expensesPaid, BigDecimal essentialPaid,
                         BigDecimal variablePaid, BigDecimal goalPurchasesPaid, BigDecimal exceptionalPaid,
                         BigDecimal refunds, BigDecimal savedToSavings, BigDecimal unspent, BigDecimal averageIncome,
                         BigDecimal averageExpenses, Integer savingsRate) {
    }

    /** Depenses nettes d'une categorie racine et de ses sous-categories ; `percent` : part des depenses categorisees. */
    public record CategoryStat(UUID categoryId, String name, String icon, String color, BigDecimal amount, long count,
                               int percent, List<SubcategoryStat> children) {
    }

    public record SubcategoryStat(UUID categoryId, String name, BigDecimal amount) {
    }

    /** Achat d'objectif : ecart = prix reel - prix estime (negatif : moins cher que prevu). */
    public record PurchaseStat(UUID goalId, String name, LocalDate date, BigDecimal estimated, BigDecimal actual,
                               BigDecimal variance) {
    }
}
