package com.focusflow.task.dto;

import com.focusflow.task.TaskTiming;
import java.time.Instant;
import java.util.List;

public record ExecutionResponse(int executionNumber, boolean current, Instant plannedStartAt, Instant plannedEndAt,
                                Instant actualStartAt, Instant actualEndAt, Instant archivedAt, TaskTiming timing,
                                List<SessionSummary> sessions) {
}
