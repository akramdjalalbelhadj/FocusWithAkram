package com.focusflow.finance;

/** Nature d'un compte : seuls les comptes courants et especes composent le solde disponible. */
public enum AccountType {
    CURRENT,
    SAVINGS,
    CASH;

    public boolean isAvailable() {
        return this != SAVINGS;
    }
}
