package com.focusflow.dashboard.dto;

public record Kpis(int remainingTasks, int completedToday, int completedThisWeek, long focusSecondsToday,
                   int pomodorosToday, int overdueTasks, int dailyGoalMinutes, double dailyGoalProgress) {
}
