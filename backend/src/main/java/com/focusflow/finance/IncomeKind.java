package com.focusflow.finance;

/** Origine d'un revenu. Un remboursement de pret ou d'achat n'est pas un revenu. */
public enum IncomeKind {
    SALARY,
    BONUS,
    GIFT,
    SIDE_ACTIVITY,
    OTHER
}
