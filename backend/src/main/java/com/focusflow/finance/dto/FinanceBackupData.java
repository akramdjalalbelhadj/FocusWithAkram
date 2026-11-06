package com.focusflow.finance.dto;

import com.focusflow.finance.AccountType;
import com.focusflow.finance.Direction;
import com.focusflow.finance.Frequency;
import com.focusflow.finance.GoalStatus;
import com.focusflow.finance.IncomeKind;
import com.focusflow.finance.OperationStatus;
import com.focusflow.finance.OperationType;
import com.focusflow.finance.ScheduleKind;
import com.focusflow.finance.ScheduleStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

/**
 * Section financiere de la sauvegarde (format v3 et suivants) : comptes, categories, echeanciers, operations, budgets
 * et preferences, avec leurs identifiants. Toutes les listes sont facultatives. Les sauvegardes anterieures au lot 13
 * peuvent contenir plusieurs comptes, des prets (ignores) et des mouvements de prets : l'import les convertit (un seul
 * compte, categorie « Prets »). Le type d'operation est donc lu comme texte.
 *
 * <p>Format v5 : montants dates des echeanciers ({@code ScheduleData.amounts}, hors montant de base) et depenses
 * variables plafonnees ({@code envelopes}) avec leurs plafonds dates et leur suivi mensuel (commentaire, operation de
 * total du mois).
 */
public record FinanceBackupData(List<AccountData> accounts, List<CategoryData> categories, List<ScheduleData> schedules,
                                List<GoalData> goals, List<OperationData> operations,
                                List<BudgetData> budgets, PreferencesData preferences, List<EnvelopeData> envelopes) {

    public record AccountData(UUID id, String name, AccountType type, Boolean archived, Integer position,
                              Instant createdAt) {
    }

    public record CategoryData(UUID id, UUID parentId, String name, String icon, String color, Integer position,
                               Boolean archived, Instant createdAt) {
    }

    public record OperationData(UUID id, UUID accountId, UUID targetAccountId, String type, OperationStatus status,
                                Direction direction, LocalDate date, BigDecimal amount, BigDecimal plannedAmount,
                                UUID categoryId, IncomeKind incomeKind, String label, String description,
                                Boolean essential, Boolean exceptional, UUID refundOfId, Instant createdAt,
                                Instant updatedAt, UUID scheduleId, LocalDate dueDate, UUID goalId) {
    }

    public record GoalData(UUID id, String name, UUID categoryId, String description, BigDecimal estimatedPrice,
                           BigDecimal maxPrice, LocalDate targetDate, Boolean important, Boolean urgent, GoalStatus status,
                           BigDecimal reservedAmount, Boolean fundedBySavings, Integer position, String notes,
                           Instant createdAt, Instant updatedAt) {
    }

    public record ScheduleData(UUID id, String label, OperationType type, ScheduleKind kind, UUID accountId,
                               UUID categoryId, IncomeKind incomeKind, BigDecimal amount, Boolean essential,
                               Frequency frequency, Integer intervalCount, LocalDate startDate, LocalDate endDate,
                               ScheduleStatus status, String notes, Instant createdAt, Instant updatedAt,
                               List<AmountData> amounts) {
    }

    /** Montant (ou plafond) a partir d'un mois. */
    public record AmountData(YearMonth fromMonth, BigDecimal amount) {
    }

    public record EnvelopeData(UUID id, UUID categoryId, String label, Integer position, YearMonth startMonth,
                               YearMonth endMonth, List<AmountData> amounts, List<EnvelopeMonthData> months,
                               Instant createdAt, Instant updatedAt) {
    }

    /** Suivi d'un mois : commentaire et operation de total du mois. */
    public record EnvelopeMonthData(YearMonth month, String comment, UUID totalOperationId) {
    }

    public record BudgetData(LocalDate month, BigDecimal variableCap, BigDecimal savingsTarget) {
    }

    public record PreferencesData(BigDecimal safetyReserve, BigDecimal savingsFloor, BigDecimal defaultVariableCap,
                                  BigDecimal defaultSavingsTarget, Integer warningPercent) {
    }
}
