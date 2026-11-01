package com.focusflow.finance.dto;

/** Bilan de l'import de la section financiere d'une sauvegarde. */
public record FinanceImportSummary(int accountsCreated, int accountsReused, int categoriesCreated, int categoriesReused,
                                   int operationsCreated, int operationsSkipped, int schedulesCreated,
                                   int schedulesSkipped, int budgetsRestored, boolean preferencesRestored) {
}
