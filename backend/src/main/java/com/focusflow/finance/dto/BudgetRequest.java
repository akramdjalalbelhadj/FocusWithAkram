package com.focusflow.finance.dto;

import java.math.BigDecimal;

/** Budget d'un mois ; une valeur absente reprend la valeur par defaut des preferences. */
public record BudgetRequest(BigDecimal variableCap, BigDecimal savingsTarget) {
}
