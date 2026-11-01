package com.focusflow.statistics.dto;

import com.focusflow.task.Quadrant;
import com.focusflow.task.TaskStatus;
import java.util.Map;

public record TaskStats(long created, long completed, long overdueNow, long createdAndDone, double completionRate,
                        Map<Quadrant, Long> activeByQuadrant, Map<TaskStatus, Long> byStatus) {
}
