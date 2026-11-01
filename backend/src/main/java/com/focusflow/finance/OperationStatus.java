package com.focusflow.finance;

/** Seule une operation realisee modifie le solde reel ; une prevue n'alimente que les previsions. */
public enum OperationStatus {
    PLANNED,
    COMPLETED,
    CANCELLED
}
