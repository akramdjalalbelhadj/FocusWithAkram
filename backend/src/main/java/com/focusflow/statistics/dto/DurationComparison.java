package com.focusflow.statistics.dto;

import java.time.Instant;
import java.util.UUID;

public record DurationComparison(UUID taskId, String title, Instant completedAt, long plannedSeconds, long elapsedSeconds) {
}
