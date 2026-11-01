package com.focusflow.task.dto;

import com.focusflow.pomodoro.SessionStatus;
import java.time.Instant;
import java.util.UUID;

public record SessionSummary(UUID id, SessionStatus status, Instant startedAt, Instant endedAt, int plannedSeconds,
                             int workedSeconds) {
}
