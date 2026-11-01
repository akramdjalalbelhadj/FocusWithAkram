package com.focusflow.finance.dto;

import com.focusflow.finance.AccountType;
import com.focusflow.finance.Direction;
import com.focusflow.finance.IncomeKind;
import com.focusflow.finance.OperationStatus;
import com.focusflow.finance.OperationType;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Section financiere de la sauvegarde (format v3) : comptes, categories et operations, avec leurs identifiants. */
public record FinanceBackupData(List<AccountData> accounts, List<CategoryData> categories, List<OperationData> operations) {

    public record AccountData(UUID id, String name, AccountType type, Boolean archived, Integer position,
                              Instant createdAt) {
    }

    public record CategoryData(UUID id, UUID parentId, String name, String icon, String color, Integer position,
                               Boolean archived, Instant createdAt) {
    }

    public record OperationData(UUID id, UUID accountId, UUID targetAccountId, OperationType type, OperationStatus status,
                                Direction direction, LocalDate date, BigDecimal amount, BigDecimal plannedAmount,
                                UUID categoryId, IncomeKind incomeKind, String label, String description,
                                Boolean essential, Boolean exceptional, UUID refundOfId, Instant createdAt,
                                Instant updatedAt) {
    }
}
