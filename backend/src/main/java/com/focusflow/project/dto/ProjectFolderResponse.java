package com.focusflow.project.dto;

import java.time.Instant;
import java.util.UUID;

public record ProjectFolderResponse(UUID id, String name, String color, Instant createdAt, long projectCount) {
}
