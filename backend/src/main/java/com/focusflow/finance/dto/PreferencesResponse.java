package com.focusflow.finance.dto;

import java.math.BigDecimal;

public record PreferencesResponse(BigDecimal safetyReserve, BigDecimal savingsFloor, BigDecimal defaultVariableCap,
                                  BigDecimal defaultSavingsTarget, int warningPercent) {
}
