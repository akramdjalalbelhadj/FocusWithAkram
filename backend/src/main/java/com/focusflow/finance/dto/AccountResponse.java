package com.focusflow.finance.dto;

import com.focusflow.finance.AccountType;
import java.math.BigDecimal;
import java.util.UUID;

/** Compte et son solde reel (somme de ses operations realisees). */
public record AccountResponse(UUID id, String name, AccountType type, boolean archived, int position,
                              BigDecimal balance, boolean hasOperations) {
}
