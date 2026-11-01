package com.focusflow.pomodoro.dto;

import java.time.LocalDate;

public record DayHistory(LocalDate date, long workedSeconds, int completedSessions, int interruptedSessions,
                         java.util.List<HistoryEntry> sessions) {
}
