package com.focusflow.task.dto;

import com.focusflow.task.Quadrant;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateTaskRequest(
        @NotBlank(message = "Le titre est obligatoire.") @Size(max = 200, message = "200 caracteres maximum.") String title,
        @Size(max = 10_000, message = "10 000 caracteres maximum.") String description,
        @Size(max = 10_000, message = "10 000 caracteres maximum.") String notes,
        Quadrant quadrant,
        Instant plannedStartAt,
        Instant plannedEndAt,
        @Min(value = 1, message = "Minimum 1 minute.") @Max(value = 100_000, message = "Maximum 100000 minutes.") Integer estimatedMinutes,
        UUID projectId,
        @Size(max = 10, message = "10 etiquettes maximum.") List<@Size(max = 40, message = "40 caracteres maximum.") String> tags,
        @Size(max = 100, message = "100 sous-taches maximum.") List<@Size(max = 200) String> subtasks) {
}
