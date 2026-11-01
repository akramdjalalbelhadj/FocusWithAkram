package com.focusflow.eisenhower.dto;

import com.focusflow.task.dto.TaskResponse;
import com.focusflow.task.Quadrant;
import java.util.List;

public record QuadrantView(Quadrant quadrant, String label, int count, int overdueCount, List<TaskResponse> tasks) {
}
