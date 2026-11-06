package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.YearMonth;

/** Montant valable a partir du mois `fromMonth` (AAAA-MM), jusqu'a la version suivante. */
public record AmountVersion(YearMonth fromMonth, BigDecimal amount) {
}
