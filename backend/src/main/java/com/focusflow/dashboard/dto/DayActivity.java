package com.focusflow.dashboard.dto;

import java.time.LocalDate;

public record DayActivity(LocalDate date, int tasksCompleted, long focusSeconds) {
}
