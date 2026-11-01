package com.focusflow.finance.dto;

import com.focusflow.finance.LoanDirection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Nouveau pret ou emprunt. `recordDisbursement` faux : pret anterieur au suivi, dont l'argent est deja sorti (ou
 * entre) avant le solde initial ; aucun mouvement n'est enregistre, pour ne pas le compter deux fois.
 */
public record LoanRequest(
        @NotBlank(message = "La personne est obligatoire.") @Size(max = 120, message = "120 caracteres maximum.") String person,
        @NotNull(message = "Le sens est obligatoire.") LoanDirection direction,
        @NotNull(message = "Le montant est obligatoire.") BigDecimal amount,
        @NotNull(message = "La date est obligatoire.") LocalDate startDate,
        LocalDate dueDate,
        UUID accountId,
        Boolean recordDisbursement,
        @Size(max = 2000, message = "2000 caracteres maximum.") String notes) {
}
