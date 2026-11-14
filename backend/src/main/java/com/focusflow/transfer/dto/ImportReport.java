package com.focusflow.transfer.dto;

import com.focusflow.finance.dto.FinanceImportSummary;
import com.focusflow.note.dto.NotesImportSummary;
import java.util.List;

/** Rapport d'import (dossiers de projets : v6 ; conflits et leur traitement : lot 25) ; `finance` et `notes` sont absents si la sauvegarde ne contient pas ces sections. */
public record ImportReport(boolean dryRun, int projectsCreated, int projectsReused, int tasksCreated, int tasksSkipped,
                           int sessionsCreated, int sessionsSkipped, List<String> errors, boolean settingsRestored,
                           int dailyGoalsCreated, int dailyGoalsSkipped,
                           FinanceImportSummary finance, NotesImportSummary notes,
                           int foldersCreated, int foldersReused,
                           List<ImportConflict> conflicts, String conflictMode, int projectsReplaced,
                           int projectsIgnored, int tasksReplaced, int tasksIgnored) {
}
