package com.focusflow.project.dto;

import java.time.Instant;
import java.util.UUID;

public record ProjectResponse(UUID id, String name, String description, String color, String icon, Instant dueAt,
                              boolean archived, Instant createdAt, long totalTasks, long doneTasks) {
}
