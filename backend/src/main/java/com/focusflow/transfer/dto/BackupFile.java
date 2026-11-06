package com.focusflow.transfer.dto;

import com.focusflow.finance.dto.FinanceBackupData;
import com.focusflow.note.dto.NotesBackupData;
import java.time.Instant;
import java.util.List;

/**
 * Format de sauvegarde JSON versionne : tout ce qui est necessaire pour restaurer l'historique.
 * <ul>
 *   <li>v1 : projets, taches (etiquettes, sous-taches, cycles) et sessions Pomodoro terminees ;</li>
 *   <li>v2 : ajoute les preferences et le Top 3 quotidien ;</li>
 *   <li>v3 : ajoute le module « Mes achats » (comptes, categories, operations) ;</li>
 *   <li>v4 : ajoute le module Notes & idees (categories d'idees, idees), l'idee d'origine des taches
 *       ({@code sourceNoteId}) et le mode d'editeur des notes ;</li>
 *   <li>v5 : « Mes achats » simplifie (lot 13) : montants dates des echeanciers et depenses variables plafonnees
 *       (plafonds dates, commentaires et totaux du mois). Les sauvegardes v3 et v4 (plusieurs comptes, prets) sont
 *       converties a l'import.</li>
 * </ul>
 * Une sauvegarde d'une version anterieure reste importable : les sections absentes sont ignorees.
 */
public record BackupFile(int version, Instant exportedAt, List<ProjectData> projects, List<TaskData> tasks,
                         List<SessionData> sessions, SettingsData settings, List<DailyGoalData> dailyGoals,
                         FinanceBackupData finance, NotesBackupData notes) {

    public static final int CURRENT_VERSION = 5;
    public static final int OLDEST_SUPPORTED_VERSION = 1;

}
