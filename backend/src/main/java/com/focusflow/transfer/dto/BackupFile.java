package com.focusflow.transfer.dto;

import com.focusflow.finance.dto.FinanceBackupData;
import java.time.Instant;
import java.util.List;

/**
 * Format de sauvegarde JSON versionne : tout ce qui est necessaire pour restaurer l'historique.
 * <ul>
 *   <li>v1 : projets, taches (etiquettes, sous-taches, cycles) et sessions Pomodoro terminees ;</li>
 *   <li>v2 : ajoute les preferences et le Top 3 quotidien ;</li>
 *   <li>v3 : ajoute le module « Mes achats » (comptes, categories, operations).</li>
 * </ul>
 * Une sauvegarde d'une version anterieure reste importable : les sections absentes sont ignorees.
 */
public record BackupFile(int version, Instant exportedAt, List<ProjectData> projects, List<TaskData> tasks,
                         List<SessionData> sessions, SettingsData settings, List<DailyGoalData> dailyGoals,
                         FinanceBackupData finance) {

    public static final int CURRENT_VERSION = 3;
    public static final int OLDEST_SUPPORTED_VERSION = 1;

}
