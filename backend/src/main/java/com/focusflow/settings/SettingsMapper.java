package com.focusflow.settings;

import com.focusflow.settings.dto.SettingsResponse;

/** Mapping explicite entre le modele persistant et le contrat HTTP. */
public final class SettingsMapper {
    private SettingsMapper() {}

    public static SettingsResponse toResponse(UserSettings s) {
        return new SettingsResponse(s.getTimeZone(), s.getWeekStartsOn(), s.getTheme(), s.getWorkMinutes(),
                s.getShortBreakMinutes(), s.getLongBreakMinutes(), s.getSessionsBeforeLong(),
                s.isAutoStartBreaks(), s.isAutoStartWork(), s.isNotificationsEnabled(), s.isSoundEnabled(),
                s.getSoundName(), s.getDailyFocusGoalMinutes(), s.isSubtasksCompleteParent(),
                s.isShortcutsEnabled(), s.isCompactMode(), s.getNoteEditorMode(),
                s.isNotesTutorialDone(), s.isMatrixTutorialDone(), s.getDisplayName());
    }
}
