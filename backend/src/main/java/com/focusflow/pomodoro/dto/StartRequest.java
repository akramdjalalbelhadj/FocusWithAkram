package com.focusflow.pomodoro.dto;

import com.focusflow.pomodoro.enums.SessionType;
import java.util.UUID;

public record StartRequest(SessionType type, UUID taskId, Integer plannedSeconds) {
}
