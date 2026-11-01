package com.focusflow.statistics.dto;

import java.time.LocalDate;
import java.util.List;

public record Productivity(LocalDate from, LocalDate to, String timeZone, TaskStats tasks, FocusStats focus,
                           PlanningStats planning, List<DayPoint> daily) {
}
