package com.focusflow.dashboard.dto;

import com.focusflow.task.dto.TaskResponse;
import java.util.List;

public record TopGoals(List<TaskResponse> tasks, int done, int total) {
}
