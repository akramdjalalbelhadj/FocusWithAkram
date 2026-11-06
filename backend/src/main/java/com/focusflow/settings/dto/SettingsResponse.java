package com.focusflow.settings.dto;

public record SettingsResponse(String timeZone, String weekStartsOn, String theme, int workMinutes,
                               int shortBreakMinutes, int longBreakMinutes, int sessionsBeforeLong,
                               boolean autoStartBreaks, boolean autoStartWork, boolean notificationsEnabled,
                               boolean soundEnabled, String soundName, int dailyFocusGoalMinutes,
                               boolean subtasksCompleteParent, boolean shortcutsEnabled, boolean compactMode,
                               String noteEditorMode, boolean notesTutorialDone,
                               boolean matrixTutorialDone) {
}
