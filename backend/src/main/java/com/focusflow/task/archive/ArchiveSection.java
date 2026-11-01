package com.focusflow.task.archive;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;

/** Section chronologique des archives. Une tache appartient a exactement une section. */
public enum ArchiveSection {
    TODAY,
    YESTERDAY,
    THIS_WEEK,
    THIS_MONTH,
    PREVIOUS_MONTHS,
    PREVIOUS_YEARS;

    /**
     * Classe un jour de fin reelle (deja converti dans le fuseau de l'utilisateur) par rapport a aujourd'hui.
     * L'ordre des tests rend les sections mutuellement exclusives ; un jour futur (derive d'horloge) compte comme aujourd'hui.
     */
    public static ArchiveSection of(LocalDate endDay, LocalDate today, DayOfWeek weekStart) {
        if (!endDay.isBefore(today)) {
            return TODAY;
        }
        if (endDay.equals(today.minusDays(1))) {
            return YESTERDAY;
        }
        LocalDate startOfWeek = today.with(TemporalAdjusters.previousOrSame(weekStart));
        if (!endDay.isBefore(startOfWeek)) {
            return THIS_WEEK;
        }
        if (YearMonth.from(endDay).equals(YearMonth.from(today))) {
            return THIS_MONTH;
        }
        return endDay.getYear() == today.getYear() ? PREVIOUS_MONTHS : PREVIOUS_YEARS;
    }
}
