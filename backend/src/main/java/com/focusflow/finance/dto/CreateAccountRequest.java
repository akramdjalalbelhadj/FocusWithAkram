package com.focusflow.finance.dto;

import com.focusflow.finance.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Creation d'un compte ; le solde initial (eventuellement negatif) devient une operation datee. */
public record CreateAccountRequest(
        @NotBlank(message = "Le nom du compte est obligatoire.") @Size(max = 80, message = "80 caracteres maximum.") String name,
        @NotNull(message = "Le type de compte est obligatoire.") AccountType type,
        BigDecimal openingBalance,
        LocalDate openingDate) {
}
