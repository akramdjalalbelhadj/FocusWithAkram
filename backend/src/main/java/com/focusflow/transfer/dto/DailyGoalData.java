package com.focusflow.transfer.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Objectif du Top 3 : une tache choisie pour une date locale, a une position 0..2. */
public record DailyGoalData(LocalDate goalDate, UUID taskId, int position, Instant createdAt) {
}
