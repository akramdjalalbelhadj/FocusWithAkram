package com.focusflow.dashboard.dto;

import com.focusflow.task.dto.TaskResponse;
import java.time.LocalDate;
import java.util.List;

public record Summary(LocalDate today, String timeZone, Kpis kpis, TopGoals top3, List<QuadrantCount> matrix,
                      List<DayActivity> week, TaskResponse inProgress) {
}
