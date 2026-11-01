package com.focusflow.transfer.dto;

import java.time.Instant;
import java.util.List;

/** Format de sauvegarde JSON versionne : tout ce qui est necessaire pour restaurer l'historique. */
public record BackupFile(int version, Instant exportedAt, List<ProjectData> projects, List<TaskData> tasks,
                         List<SessionData> sessions) {

    public static final int CURRENT_VERSION = 1;

}
