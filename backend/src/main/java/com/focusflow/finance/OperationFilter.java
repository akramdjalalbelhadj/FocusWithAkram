package com.focusflow.finance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Criteres de l'historique des operations ; tous facultatifs. `categoryId` inclut les sous-categories d'une racine ;
 * `accountId` inclut les virements recus par ce compte.
 */
public record OperationFilter(LocalDate from, LocalDate to, UUID accountId, List<OperationType> types,
                              List<OperationStatus> statuses, UUID categoryId, Boolean essential, Boolean exceptional,
                              String q, BigDecimal minAmount, BigDecimal maxAmount) {
}
