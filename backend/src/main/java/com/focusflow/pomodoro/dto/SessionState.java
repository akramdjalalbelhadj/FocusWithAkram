package com.focusflow.pomodoro.dto;

import java.time.Instant;

public record SessionState(SessionResponse session, Instant serverTime) {
}
