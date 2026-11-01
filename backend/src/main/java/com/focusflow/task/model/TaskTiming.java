package com.focusflow.task.model;

import java.time.Duration;
import java.time.Instant;

/**
 * Comparaison entre planning et realisation. Tous les ecarts sont signes : une valeur negative signifie
 * que l'evenement est survenu plus tot que prevu. Les durees sont en secondes ; un champ est null
 * lorsque l'une des dates necessaires n'existe pas (rien n'est invente).
 *
 * <ul>
 *   <li>plannedDuration = fin prevue - debut prevu</li>
 *   <li>actualElapsed = fin reelle - debut reel (temps ecoule, pas temps travaille)</li>
 *   <li>activeSeconds = cumul des sessions Pomodoro de travail enregistrees</li>
 *   <li>startVariance = debut reel - debut prevu</li>
 *   <li>endVariance = fin reelle - fin prevue</li>
 *   <li>durationVariance = actualElapsed - plannedDuration</li>
 * </ul>
 */
public record TaskTiming(Long plannedDurationSeconds, Long actualElapsedSeconds, long activeSeconds,
                         Long startVarianceSeconds, Long endVarianceSeconds, Long durationVarianceSeconds,
                         Punctuality punctuality) {

    /** Marge dans laquelle une fin est consideree "a l'heure". */
    public static final Duration ON_TIME_TOLERANCE = Duration.ofMinutes(5);

    public enum Punctuality { EARLY, ON_TIME, LATE }

    public static TaskTiming compute(Instant plannedStart, Instant plannedEnd, Instant actualStart, Instant actualEnd,
                                     long activeSeconds) {
        Long planned = between(plannedStart, plannedEnd);
        Long elapsed = between(actualStart, actualEnd);
        Long startVar = between(plannedStart, actualStart);
        Long endVar = between(plannedEnd, actualEnd);
        Long durationVar = planned != null && elapsed != null ? elapsed - planned : null;
        return new TaskTiming(planned, elapsed, activeSeconds, startVar, endVar, durationVar, punctuality(endVar));
    }

    static Punctuality punctuality(Long endVarianceSeconds) {
        if (endVarianceSeconds == null) {
            return null;
        }
        long tolerance = ON_TIME_TOLERANCE.toSeconds();
        if (endVarianceSeconds < -tolerance) {
            return Punctuality.EARLY;
        }
        return endVarianceSeconds > tolerance ? Punctuality.LATE : Punctuality.ON_TIME;
    }

    private static Long between(Instant from, Instant to) {
        return from == null || to == null ? null : Duration.between(from, to).toSeconds();
    }
}
