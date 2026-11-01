package com.focusflow.finance.dto;

import com.focusflow.finance.Frequency;
import com.focusflow.finance.IncomeKind;
import com.focusflow.finance.OperationType;
import com.focusflow.finance.ScheduleKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Creation ou remplacement complet d'un echeancier. `startDate` est la premiere echeance suivie ;
 * `occurrences` (facultatif, paiement en plusieurs fois) fixe la date de fin a la derniere echeance.
 */
public record ScheduleRequest(
        @NotBlank(message = "Le libelle est obligatoire.") @Size(max = 120, message = "120 caracteres maximum.") String label,
        @NotNull(message = "Le type est obligatoire.") OperationType type,
        @NotNull(message = "La nature est obligatoire.") ScheduleKind kind,
        @NotNull(message = "Le compte est obligatoire.") UUID accountId,
        UUID categoryId,
        IncomeKind incomeKind,
        @NotNull(message = "Le montant est obligatoire.") BigDecimal amount,
        Boolean essential,
        @NotNull(message = "La periodicite est obligatoire.") Frequency frequency,
        Integer intervalCount,
        @NotNull(message = "La premiere echeance est obligatoire.") LocalDate startDate,
        LocalDate endDate,
        Integer occurrences,
        @Size(max = 2000, message = "2000 caracteres maximum.") String notes) {
}
