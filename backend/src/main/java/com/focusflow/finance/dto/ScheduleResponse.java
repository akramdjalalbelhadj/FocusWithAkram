package com.focusflow.finance.dto;

import com.focusflow.finance.Frequency;
import com.focusflow.finance.IncomeKind;
import com.focusflow.finance.OperationType;
import com.focusflow.finance.ScheduleKind;
import com.focusflow.finance.ScheduleStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Echeancier avec sa prochaine echeance et ses equivalents mensuel et annuel au montant valable aujourd'hui (arrondis
 * au centime ; ils servent aux analyses, les paiements reels gardent leur montant exact). `amount` est le montant de
 * base (premiere echeance) ; `amounts` liste les montants dates, le premier commencant au mois de la premiere echeance.
 */
public record ScheduleResponse(UUID id, String label, OperationType type, ScheduleKind kind, AccountRef account,
                               CategoryRef category, IncomeKind incomeKind, BigDecimal amount, boolean essential,
                               Frequency frequency, int intervalCount, LocalDate startDate, LocalDate endDate,
                               ScheduleStatus status, String notes, LocalDate nextDueDate,
                               BigDecimal monthlyEquivalent, BigDecimal annualEquivalent, boolean hasOperations,
                               List<AmountVersion> amounts) {
}
