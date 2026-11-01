package com.focusflow.task.dto;

import java.time.Instant;
import java.util.UUID;

public record SubtaskResponse(UUID id, String title, boolean done, int position, Instant createdAt) {
}
