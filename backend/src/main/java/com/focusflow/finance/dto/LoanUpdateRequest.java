package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Personne, echeance et notes d'un pret (le montant et la date decoulent du versement). */
public record LoanUpdateRequest(
        @NotBlank(message = "La personne est obligatoire.") @Size(max = 120, message = "120 caracteres maximum.") String person,
        LocalDate dueDate,
        @Size(max = 2000, message = "2000 caracteres maximum.") String notes) {
}
