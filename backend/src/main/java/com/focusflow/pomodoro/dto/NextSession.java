package com.focusflow.pomodoro.dto;

import com.focusflow.pomodoro.enums.SessionType;

public record NextSession(SessionType type, int plannedSeconds, int sequenceNumber) {
}
