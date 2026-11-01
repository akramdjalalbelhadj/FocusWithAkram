package com.focusflow.statistics.dto;

import java.util.List;

public record FocusStats(long totalSeconds, long completedSessions, long interruptedSessions, long averageSessionSeconds,
                         int dailyGoalMinutes, long daysGoalReached, List<ProjectShare> byProject, List<TaskShare> byTask) {
}
