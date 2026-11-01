package com.focusflow.finance.dto;

import com.focusflow.finance.Direction;
import com.focusflow.finance.IncomeKind;
import com.focusflow.finance.OperationStatus;
import com.focusflow.finance.OperationType;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Operation telle qu'affichee. `plannedAmount` n'est renseigne que pour une operation prevue puis realisee ;
 * `overdue` signale une operation prevue dont la date est passee.
 */
public record OperationResponse(UUID id, AccountRef account, AccountRef targetAccount, OperationType type,
                                OperationStatus status, Direction direction, LocalDate date, BigDecimal amount,
                                BigDecimal plannedAmount, CategoryRef category, IncomeKind incomeKind, String label,
                                String description, boolean essential, boolean exceptional, UUID refundOfId,
                                boolean overdue, Instant createdAt, Instant updatedAt) {
}
