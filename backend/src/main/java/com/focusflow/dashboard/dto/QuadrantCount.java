package com.focusflow.dashboard.dto;

import com.focusflow.task.Quadrant;

public record QuadrantCount(Quadrant quadrant, int count, int overdue) {
}
