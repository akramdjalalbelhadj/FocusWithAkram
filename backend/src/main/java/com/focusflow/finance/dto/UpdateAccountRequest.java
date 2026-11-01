package com.focusflow.finance.dto;

import com.focusflow.finance.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Remplacement complet des proprietes d'un compte (son solde, lui, decoule des operations). */
public record UpdateAccountRequest(
        @NotBlank(message = "Le nom du compte est obligatoire.") @Size(max = 80, message = "80 caracteres maximum.") String name,
        @NotNull(message = "Le type de compte est obligatoire.") AccountType type,
        Boolean archived,
        Integer position) {
}
