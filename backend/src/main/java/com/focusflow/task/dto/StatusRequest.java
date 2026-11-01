package com.focusflow.task.dto;

import com.focusflow.task.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record StatusRequest(@NotNull(message = "Le statut est obligatoire.") TaskStatus status, Instant actualStartAt) {
}
