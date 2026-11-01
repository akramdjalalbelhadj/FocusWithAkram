package com.focusflow.dashboard.dto;

import com.focusflow.task.enums.Quadrant;

public record QuadrantCount(Quadrant quadrant, int count, int overdue) {
}
