package com.focusflow.finance.dto;

import com.focusflow.finance.IncomeKind;
import com.focusflow.finance.OperationStatus;
import com.focusflow.finance.OperationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Creation ou remplacement complet d'une operation. Les soldes initiaux et les corrections ne passent pas par ce
 * contrat : ils naissent de la creation d'un compte et du rapprochement de son solde. Indicateurs absents = faux.
 */
public record OperationRequest(
        @NotNull(message = "Le compte est obligatoire.") UUID accountId,
        @NotNull(message = "Le type est obligatoire.") OperationType type,
        @NotNull(message = "Le statut est obligatoire.") OperationStatus status,
        @NotNull(message = "La date est obligatoire.") LocalDate date,
        @NotNull(message = "Le montant est obligatoire.") BigDecimal amount,
        @NotBlank(message = "Le libelle est obligatoire.") @Size(max = 120, message = "120 caracteres maximum.") String label,
        @Size(max = 2000, message = "2000 caracteres maximum.") String description,
        UUID categoryId,
        IncomeKind incomeKind,
        Boolean essential,
        Boolean exceptional,
        UUID targetAccountId,
        UUID refundOfId) {
}
