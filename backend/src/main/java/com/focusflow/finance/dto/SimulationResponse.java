package com.focusflow.finance.dto;

import java.util.UUID;

/** Prevision actuelle et prevision sous hypotheses ; `extraGoalId` identifie l'achat supplementaire simule. */
public record SimulationResponse(ForecastResponse baseline, ForecastResponse simulated, UUID extraGoalId) {
}
