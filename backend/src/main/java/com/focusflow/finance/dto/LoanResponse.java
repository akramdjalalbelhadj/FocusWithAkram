package com.focusflow.finance.dto;

import com.focusflow.finance.LoanDirection;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Pret et son etat calcule : rembourse, reste du (montant - remboursements - regularisation), statut OPEN, SETTLED,
 * WRITTEN_OFF ou CANCELLED, et retard (echeance depassee avec un reste du).
 */
public record LoanResponse(UUID id, String person, LoanDirection direction, BigDecimal principal, LocalDate startDate,
                           LocalDate dueDate, String notes, BigDecimal repaid, BigDecimal writtenOffAmount,
                           LocalDate writtenOffDate, String writtenOffReason, BigDecimal remaining, String status,
                           boolean overdue, List<OperationResponse> movements, Instant createdAt) {
}
