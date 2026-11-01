package com.focusflow.finance;

/** Un echeancier suspendu ou termine ne produit plus d'echeance ; son historique reste. */
public enum ScheduleStatus {
    ACTIVE,
    PAUSED,
    ENDED
}
