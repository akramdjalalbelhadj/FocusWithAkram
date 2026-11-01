package com.focusflow.transfer.dto;

/**
 * Preferences sauvegardees. Les champs sont nullables : une sauvegarde plus ancienne ou plus recente
 * ne restaure que les preferences qu'elle contient, avec les validations habituelles.
 */
public record SettingsData(String timeZone, String weekStartsOn, String theme, Integer workMinutes,
                           Integer shortBreakMinutes, Integer longBreakMinutes, Integer sessionsBeforeLong,
                           Boolean autoStartBreaks, Boolean autoStartWork, Boolean notificationsEnabled,
                           Boolean soundEnabled, String soundName, Integer dailyFocusGoalMinutes,
                           Boolean subtasksCompleteParent, Boolean shortcutsEnabled, Boolean compactMode) {
}
