package com.focusflow.transfer.dto;

import java.util.List;

public record ImportReport(boolean dryRun, int projectsCreated, int projectsReused, int tasksCreated, int tasksSkipped,
                           int sessionsCreated, int sessionsSkipped, List<String> errors, boolean settingsRestored,
                           int dailyGoalsCreated, int dailyGoalsSkipped) {
}
