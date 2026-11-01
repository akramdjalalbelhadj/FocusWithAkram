package com.focusflow.pomodoro.dto;

import com.focusflow.pomodoro.SessionType;

public record NextSession(SessionType type, int plannedSeconds, int sequenceNumber) {
}
