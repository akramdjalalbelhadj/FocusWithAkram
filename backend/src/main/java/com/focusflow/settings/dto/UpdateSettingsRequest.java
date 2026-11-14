package com.focusflow.settings.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.focusflow.common.PatchRequest;

/** Champs modifiables de cette ressource ; presence et null explicite sont conserves. */
public class UpdateSettingsRequest extends PatchRequest {

    @JsonSetter("timeZone")
    public void setTimeZone(String value) {
        set("timeZone", value);
    }

    @JsonSetter("weekStartsOn")
    public void setWeekStartsOn(String value) {
        set("weekStartsOn", value);
    }

    @JsonSetter("theme")
    public void setTheme(String value) {
        set("theme", value);
    }

    @JsonSetter("noteEditorMode")
    public void setNoteEditorMode(String value) {
        set("noteEditorMode", value);
    }

    @JsonSetter("soundName")
    public void setSoundName(String value) {
        set("soundName", value);
    }

    @JsonSetter("workMinutes")
    public void setWorkMinutes(Integer value) {
        set("workMinutes", value);
    }

    @JsonSetter("shortBreakMinutes")
    public void setShortBreakMinutes(Integer value) {
        set("shortBreakMinutes", value);
    }

    @JsonSetter("longBreakMinutes")
    public void setLongBreakMinutes(Integer value) {
        set("longBreakMinutes", value);
    }

    @JsonSetter("sessionsBeforeLong")
    public void setSessionsBeforeLong(Integer value) {
        set("sessionsBeforeLong", value);
    }

    @JsonSetter("dailyFocusGoalMinutes")
    public void setDailyFocusGoalMinutes(Integer value) {
        set("dailyFocusGoalMinutes", value);
    }

    @JsonSetter("autoStartBreaks")
    public void setAutoStartBreaks(Boolean value) {
        set("autoStartBreaks", value);
    }

    @JsonSetter("autoStartWork")
    public void setAutoStartWork(Boolean value) {
        set("autoStartWork", value);
    }

    @JsonSetter("notificationsEnabled")
    public void setNotificationsEnabled(Boolean value) {
        set("notificationsEnabled", value);
    }

    @JsonSetter("soundEnabled")
    public void setSoundEnabled(Boolean value) {
        set("soundEnabled", value);
    }

    @JsonSetter("subtasksCompleteParent")
    public void setSubtasksCompleteParent(Boolean value) {
        set("subtasksCompleteParent", value);
    }

    @JsonSetter("shortcutsEnabled")
    public void setShortcutsEnabled(Boolean value) {
        set("shortcutsEnabled", value);
    }

    @JsonSetter("compactMode")
    public void setCompactMode(Boolean value) {
        set("compactMode", value);
    }

    @JsonSetter("notesTutorialDone")
    public void setNotesTutorialDone(Boolean value) {
        set("notesTutorialDone", value);
    }

    @JsonSetter("matrixTutorialDone")
    public void setMatrixTutorialDone(Boolean value) {
        set("matrixTutorialDone", value);
    }

    @JsonSetter("displayName")
    public void setDisplayName(String value) {
        set("displayName", value);
    }
}
