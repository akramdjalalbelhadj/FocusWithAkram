package com.focusflow.transfer.dto;

import com.focusflow.finance.dto.FinanceImportSummary;
import java.util.List;

/** Rapport d'import ; `finance` est absent si la sauvegarde ne contient pas de section financiere. */
public record ImportReport(boolean dryRun, int projectsCreated, int projectsReused, int tasksCreated, int tasksSkipped,
                           int sessionsCreated, int sessionsSkipped, List<String> errors, boolean settingsRestored,
                           int dailyGoalsCreated, int dailyGoalsSkipped,
                           FinanceImportSummary finance) {
}
