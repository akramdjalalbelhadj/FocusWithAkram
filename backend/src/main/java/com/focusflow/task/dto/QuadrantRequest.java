package com.focusflow.task.dto;

import com.focusflow.task.enums.Quadrant;
import jakarta.validation.constraints.NotNull;

public record QuadrantRequest(@NotNull(message = "Le quadrant est obligatoire.") Quadrant quadrant) {
}
