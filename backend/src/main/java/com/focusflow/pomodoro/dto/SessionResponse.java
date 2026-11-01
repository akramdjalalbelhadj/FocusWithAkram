package com.focusflow.pomodoro.dto;

import com.focusflow.pomodoro.enums.SessionStatus;
import com.focusflow.pomodoro.enums.SessionType;
import java.time.Instant;
import java.util.UUID;

public record SessionResponse(UUID id, SessionType type, SessionStatus status, UUID taskId, String taskTitle,
                              int plannedSeconds, long elapsedSeconds, long remainingSeconds, int workedSeconds,
                              int sequenceNumber, Instant startedAt, Instant lastResumedAt, Instant expectedEndAt,
                              Instant endedAt, NextSession next) {
}
