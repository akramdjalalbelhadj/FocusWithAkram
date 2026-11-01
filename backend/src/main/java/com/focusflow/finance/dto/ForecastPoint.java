package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Disponible et epargne prevus en fin de journee, puis disponible apres les achats retenus. */
public record ForecastPoint(LocalDate date, BigDecimal available, BigDecimal savings, BigDecimal afterGoals) {
}
