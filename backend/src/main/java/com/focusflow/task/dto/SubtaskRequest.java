package com.focusflow.task.dto;

import jakarta.validation.constraints.NotNull;

public record SubtaskRequest(@NotNull(message = "Le titre est obligatoire.") String title) {
}
