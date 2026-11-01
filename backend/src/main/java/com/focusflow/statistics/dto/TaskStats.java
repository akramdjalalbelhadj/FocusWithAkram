package com.focusflow.statistics.dto;

import com.focusflow.task.enums.Quadrant;
import com.focusflow.task.enums.TaskStatus;
import java.util.Map;

public record TaskStats(long created, long completed, long overdueNow, long createdAndDone, double completionRate,
                        Map<Quadrant, Long> activeByQuadrant, Map<TaskStatus, Long> byStatus) {
}
