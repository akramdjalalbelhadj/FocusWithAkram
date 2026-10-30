package com.focusflow.pomodoro;

public enum SessionStatus {
    RUNNING,
    PAUSED,
    COMPLETED,
    CANCELLED;

    public boolean isActive() {
        return this == RUNNING || this == PAUSED;
    }
}
