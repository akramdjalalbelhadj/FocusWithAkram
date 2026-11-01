package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record PostponeRequest(@NotNull(message = "La nouvelle date cible est obligatoire.") LocalDate targetDate) {
}
