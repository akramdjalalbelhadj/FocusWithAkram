package com.focusflow.transfer.dto;

import com.focusflow.pomodoro.enums.SessionStatus;
import com.focusflow.pomodoro.enums.SessionType;
import java.time.Instant;
import java.util.UUID;

public record SessionData(UUID id, UUID taskId, Integer executionNumber, SessionType type, SessionStatus status,
                          int plannedSeconds, int workedSeconds, int sequenceNumber, Instant startedAt, Instant endedAt) {
}
