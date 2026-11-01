package com.focusflow.task.dto;

import com.focusflow.task.TimelineEventType;
import java.time.Instant;

public record TimelineEvent(TimelineEventType type, Instant at, boolean occurred) {
}
