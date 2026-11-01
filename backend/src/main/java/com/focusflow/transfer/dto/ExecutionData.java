package com.focusflow.transfer.dto;

import java.time.Instant;

public record ExecutionData(int executionNumber, Instant plannedStartAt, Instant plannedEndAt, Instant actualStartAt,
                            Instant actualEndAt, Instant archivedAt) {
}
