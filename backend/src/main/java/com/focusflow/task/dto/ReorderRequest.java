package com.focusflow.task.dto;

import com.focusflow.task.Quadrant;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record ReorderRequest(@NotNull(message = "Le quadrant est obligatoire.") Quadrant quadrant,
                             @NotNull(message = "La liste est obligatoire.") @NotEmpty(message = "La liste est vide.") List<UUID> taskIds) {
}
