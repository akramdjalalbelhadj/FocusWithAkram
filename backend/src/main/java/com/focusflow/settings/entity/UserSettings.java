package com.focusflow.settings.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** Parametres de l'utilisateur unique (ligne singleton, id = 1). */
@Entity
@Table(name = "user_settings")
public class UserSettings {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id = SINGLETON_ID;

    @Column(name = "time_zone", nullable = false)
    private String timeZone = "Europe/Paris";

    @Column(name = "week_starts_on", nullable = false)
    private String weekStartsOn = "MONDAY";

    @Column(nullable = false)
    private String theme = "SYSTEM";

    @Column(name = "work_minutes", nullable = false)
    private int workMinutes = 25;

    @Column(name = "short_break_minutes", nullable = false)
    private int shortBreakMinutes = 5;

    @Column(name = "long_break_minutes", nullable = false)
    private int longBreakMinutes = 15;

    @Column(name = "sessions_before_long", nullable = false)
    private int sessionsBeforeLong = 4;

    @Column(name = "auto_start_breaks", nullable = false)
    private boolean autoStartBreaks;

    @Column(name = "auto_start_work", nullable = false)
    private boolean autoStartWork;

    @Column(name = "notifications_enabled", nullable = false)
    private boolean notificationsEnabled;

    @Column(name = "sound_enabled", nullable = false)
    private boolean soundEnabled = true;

    @Column(name = "sound_name", nullable = false)
    private String soundName = "bell";

    @Column(name = "daily_focus_goal_minutes", nullable = false)
    private int dailyFocusGoalMinutes = 120;

    @Column(name = "subtasks_complete_parent", nullable = false)
    private boolean subtasksCompleteParent;

    @Column(name = "shortcuts_enabled", nullable = false)
    private boolean shortcutsEnabled = true;

    @Column(name = "compact_mode", nullable = false)
    private boolean compactMode;

    @Version
    private long version;

    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String timeZone) { this.timeZone = timeZone; }
    public String getWeekStartsOn() { return weekStartsOn; }
    public void setWeekStartsOn(String weekStartsOn) { this.weekStartsOn = weekStartsOn; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public int getWorkMinutes() { return workMinutes; }
    public void setWorkMinutes(int workMinutes) { this.workMinutes = workMinutes; }
    public int getShortBreakMinutes() { return shortBreakMinutes; }
    public void setShortBreakMinutes(int shortBreakMinutes) { this.shortBreakMinutes = shortBreakMinutes; }
    public int getLongBreakMinutes() { return longBreakMinutes; }
    public void setLongBreakMinutes(int longBreakMinutes) { this.longBreakMinutes = longBreakMinutes; }
    public int getSessionsBeforeLong() { return sessionsBeforeLong; }
    public void setSessionsBeforeLong(int sessionsBeforeLong) { this.sessionsBeforeLong = sessionsBeforeLong; }
    public boolean isAutoStartBreaks() { return autoStartBreaks; }
    public void setAutoStartBreaks(boolean autoStartBreaks) { this.autoStartBreaks = autoStartBreaks; }
    public boolean isAutoStartWork() { return autoStartWork; }
    public void setAutoStartWork(boolean autoStartWork) { this.autoStartWork = autoStartWork; }
    public boolean isNotificationsEnabled() { return notificationsEnabled; }
    public void setNotificationsEnabled(boolean notificationsEnabled) { this.notificationsEnabled = notificationsEnabled; }
    public boolean isSoundEnabled() { return soundEnabled; }
    public void setSoundEnabled(boolean soundEnabled) { this.soundEnabled = soundEnabled; }
    public String getSoundName() { return soundName; }
    public void setSoundName(String soundName) { this.soundName = soundName; }
    public int getDailyFocusGoalMinutes() { return dailyFocusGoalMinutes; }
    public void setDailyFocusGoalMinutes(int dailyFocusGoalMinutes) { this.dailyFocusGoalMinutes = dailyFocusGoalMinutes; }
    public boolean isSubtasksCompleteParent() { return subtasksCompleteParent; }
    public void setSubtasksCompleteParent(boolean subtasksCompleteParent) { this.subtasksCompleteParent = subtasksCompleteParent; }
    public boolean isShortcutsEnabled() { return shortcutsEnabled; }
    public void setShortcutsEnabled(boolean shortcutsEnabled) { this.shortcutsEnabled = shortcutsEnabled; }
    public boolean isCompactMode() { return compactMode; }
    public void setCompactMode(boolean compactMode) { this.compactMode = compactMode; }
}
