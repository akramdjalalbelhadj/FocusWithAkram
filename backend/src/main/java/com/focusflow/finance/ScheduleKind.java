package com.focusflow.finance;

/** Nature d'un echeancier, pour le classement et les analyses (abonnements, charges, salaire…). */
public enum ScheduleKind {
    SALARY,
    SUBSCRIPTION,
    BILL,
    /** Paiement en plusieurs fois : echeancier a date de fin. */
    INSTALLMENT,
    OTHER
}
