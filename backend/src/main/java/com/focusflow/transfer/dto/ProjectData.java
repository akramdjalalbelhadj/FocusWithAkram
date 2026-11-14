package com.focusflow.transfer.dto;

import java.time.Instant;
import java.util.UUID;

public record ProjectData(UUID id, String name, String description, String color, String icon, Instant dueAt,
                          boolean archived, Instant createdAt, UUID folderId) {
}
