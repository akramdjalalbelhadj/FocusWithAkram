package com.focusflow.note.dto;

import java.time.Instant;
import java.util.UUID;

public record NoteCategoryResponse(UUID id, String name, String color, Instant createdAt, long noteCount) {
}
