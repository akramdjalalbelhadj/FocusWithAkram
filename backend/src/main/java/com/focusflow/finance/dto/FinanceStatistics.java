package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

/**
 * Statistiques d'une periode de mois complets, calculees sur les operations realisees. Les depenses sont nettes des
 * remboursements d'achats ; corrections de solde exclues. L'epargne d'un mois est ce qui reste : `unspent` = revenus
 * recus - depenses payees.
 */
public record FinanceStatistics(YearMonth from, YearMonth to, List<MonthStat> months, Totals totals,
                                List<CategoryStat> categories, List<OperationResponse> topExpenses,
                                List<PurchaseStat> purchases) {

    /**
     * Bilan d'un mois. `variableCap` / `savingsTarget` : plafond variable (somme des enveloppes actives, sinon valeur
     * du mois ou par defaut) et objectif d'epargne (valeur du mois ou par defaut) qui s'appliquaient, absents si non
     * definis, pour savoir si le seuil a ete depasse ou l'objectif tenu.
     */
    public record MonthStat(YearMonth month, BigDecimal incomeReceived, BigDecimal expensesPaid,
                            BigDecimal essentialPaid, BigDecimal variablePaid, BigDecimal goalPurchasesPaid,
                            BigDecimal savedToSavings, BigDecimal unspent, BigDecimal variableCap,
                            BigDecimal savingsTarget) {
    }

    /**
     * Totaux de la periode. Moyennes : par mois de la periode. `savingsRate` : epargne (revenus - depenses) / revenus recus,
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
