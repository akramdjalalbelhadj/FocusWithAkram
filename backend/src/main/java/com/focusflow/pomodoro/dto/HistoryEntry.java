package com.focusflow.pomodoro.dto;

import com.focusflow.pomodoro.enums.SessionStatus;
import java.time.Instant;
import java.util.UUID;

public record HistoryEntry(UUID id, SessionStatus status, UUID taskId, String taskTitle, Instant startedAt,
                           Instant endedAt, int plannedSeconds, int workedSeconds) {
}
