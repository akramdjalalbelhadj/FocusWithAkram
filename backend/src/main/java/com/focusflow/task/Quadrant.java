package com.focusflow.task;

/**
 * Quadrant de la matrice d'Eisenhower. Le quadrant n'est pas stocke : il derive des deux criteres
 * important / urgent, ce qui garantit leur coherence.
 */
public enum Quadrant {
    /** Urgent et important : FAIRE MAINTENANT. */
    Q1(true, true),
    /** Important mais non urgent : PLANIFIER. */
    Q2(true, false),
    /** Urgent mais non important : DELEGUER / LIMITER. */
    Q3(false, true),
    /** Ni urgent ni important : ELIMINER / PLUS TARD. */
    Q4(false, false);

    private final boolean important;
    private final boolean urgent;

    Quadrant(boolean important, boolean urgent) {
        this.important = important;
        this.urgent = urgent;
    }

    public boolean important() {
        return important;
    }

    public boolean urgent() {
        return urgent;
    }

    public static Quadrant of(boolean important, boolean urgent) {
        if (important) {
            return urgent ? Q1 : Q2;
        }
        return urgent ? Q3 : Q4;
    }
}
