package com.focusflow.statistics.dto;

import java.time.LocalDate;

public record DayPoint(LocalDate date, long tasksCompleted, long focusSeconds, long pomodoros) {
}
