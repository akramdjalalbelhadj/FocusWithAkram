package com.focusflow.task.dto;

import com.focusflow.task.enums.TimelineEventType;
import java.time.Instant;

public record TimelineEvent(TimelineEventType type, Instant at, boolean occurred) {
}
