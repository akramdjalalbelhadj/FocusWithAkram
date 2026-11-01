package com.focusflow.finance;

/**
 * Statut saisi d'un objectif d'achat. « En cours de financement » (reservation) et « finançable » (verdict de
 * faisabilite) sont calcules, pas saisis : ils ne peuvent pas devenir faux.
 */
public enum GoalStatus {
    CONSIDERED,
    PLANNED,
    POSTPONED,
    PURCHASED,
    ABANDONED;

    /** Objectif encore ouvert : il entre dans la prevision et peut garder une reservation. */
    public boolean isOpen() {
        return this == CONSIDERED || this == PLANNED || this == POSTPONED;
    }
}
