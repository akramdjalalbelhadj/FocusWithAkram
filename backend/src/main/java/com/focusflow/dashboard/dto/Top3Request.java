package com.focusflow.dashboard.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record Top3Request(@NotNull(message = "La liste est obligatoire.") List<UUID> taskIds) {
}
