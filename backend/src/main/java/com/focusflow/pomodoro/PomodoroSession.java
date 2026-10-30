package com.focusflow.pomodoro;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import com.focusflow.common.ApiException;
import com.focusflow.task.domain.Task;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * Session de concentration ou de pause.
 *
 * <p>Le temps ecoule n'est jamais compte par incrementation mais calcule a partir d'horodatages :
 * {@code elapsed = accumulatedSeconds + (now - lastResumedAt)} lorsque la session tourne. Une session
 * en cours peut donc etre relue a tout moment (rechargement, onglet en arriere-plan, fermeture du
 * navigateur) sans derive ni double comptage. Le temps travaille n'est fige qu'une seule fois, a la
 * cloture ({@link #complete} / {@link #cancel}), qui sont idempotentes.
 */
@Entity
@Table(name = "pomodoro_session")
public class PomodoroSession {

    /** Marge acceptee entre la fin theorique et l'appel de cloture (latence reseau, arrondis). */
    static final Duration COMPLETION_GRACE = Duration.ofSeconds(3);

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(name = "execution_number")
    private Integer executionNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status;

    @Column(name = "planned_seconds", nullable = false)
    private int plannedSeconds;

    @Column(name = "accumulated_seconds", nullable = false)
    private int accumulatedSeconds;

    @Column(name = "worked_seconds", nullable = false)
    private int workedSeconds;

    @Column(name = "sequence_number", nullable = false)
    private int sequenceNumber = 1;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "last_resumed_at")
    private Instant lastResumedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Version
    private long version;

    protected PomodoroSession() {
    }

    public PomodoroSession(SessionType type, int plannedSeconds, int sequenceNumber, Task task, Instant now) {
        this.type = type;
        this.plannedSeconds = plannedSeconds;
        this.sequenceNumber = sequenceNumber;
        this.status = SessionStatus.RUNNING;
        this.startedAt = now;
        this.lastResumedAt = now;
        if (task != null && type == SessionType.WORK) {
            this.task = task;
            this.executionNumber = task.getExecutionNumber();
        }
    }

    /** Session terminee issue d'une sauvegarde (jamais d'etat actif : evite toute session fantome). */
    public static PomodoroSession imported(UUID id, Task task, Integer executionNumber, SessionType type, SessionStatus status,
                                           int plannedSeconds, int workedSeconds, int sequenceNumber, Instant startedAt,
                                           Instant endedAt) {
        if (status == null || status.isActive() || endedAt == null || type == null || startedAt == null || plannedSeconds <= 0) {
            throw ApiException.rule("IMPORT_INVALID_SESSION", "Session invalide ou non terminee : elle n'est pas importee.");
        }
        PomodoroSession s = new PomodoroSession();
        if (id != null) {
            s.id = id;
        }
        s.type = type;
        s.status = status;
        s.plannedSeconds = plannedSeconds;
        s.workedSeconds = type == SessionType.WORK ? Math.max(0, Math.min(workedSeconds, plannedSeconds)) : 0;
        s.accumulatedSeconds = s.workedSeconds;
        s.sequenceNumber = Math.max(1, sequenceNumber);
        s.startedAt = startedAt;
        s.endedAt = endedAt;
        if (task != null && type == SessionType.WORK) {
            s.task = task;
            s.executionNumber = executionNumber;
        }
        return s;
    }

    public long elapsedSeconds(Instant now) {
        long running = status == SessionStatus.RUNNING && lastResumedAt != null
                ? Math.max(0, Duration.between(lastResumedAt, now).toSeconds()) : 0;
        return accumulatedSeconds + running;
    }

    public long remainingSeconds(Instant now) {
        if (!status.isActive()) {
            return 0;
        }
        return Math.max(0, plannedSeconds - elapsedSeconds(now));
    }

    /** Instant de fin theorique, uniquement lorsque la session tourne. */
    public Instant expectedEndAt() {
        if (status != SessionStatus.RUNNING) {
            return null;
        }
        return lastResumedAt.plusSeconds(Math.max(0, plannedSeconds - accumulatedSeconds));
    }

    public boolean hasExpired(Instant now) {
        return status == SessionStatus.RUNNING && elapsedSeconds(now) >= plannedSeconds;
    }

    /** Idempotent : mettre en pause une session deja en pause ne change rien. */
    public void pause(Instant now) {
        if (status == SessionStatus.PAUSED) {
            return;
        }
        requireActive("mise en pause");
        accumulatedSeconds = (int) Math.min(plannedSeconds, elapsedSeconds(now));
        lastResumedAt = null;
        status = SessionStatus.PAUSED;
    }

    /** Idempotent : reprendre une session deja en cours ne change rien. */
    public void resume(Instant now) {
        if (status == SessionStatus.RUNNING) {
            return;
        }
        requireActive("reprise");
        lastResumedAt = now;
        status = SessionStatus.RUNNING;
    }

    /**
     * Termine normalement la session. N'est accepte que si la duree prevue est ecoulee (a la marge pres) :
     * une session interrompue doit passer par {@link #cancel}. Idempotent sur une session deja terminee.
     */
    public void complete(Instant now) {
        if (status == SessionStatus.COMPLETED) {
            return;
        }
        if (status == SessionStatus.CANCELLED) {
            throw ApiException.conflict("SESSION_CANCELLED", "La session a deja ete interrompue.");
        }
        long elapsed = elapsedSeconds(now);
        if (elapsed + COMPLETION_GRACE.toSeconds() < plannedSeconds) {
            throw ApiException.rule("SESSION_NOT_FINISHED",
                    "La duree de la session n'est pas ecoulee : " + (plannedSeconds - elapsed) + " s restantes.");
        }
        Instant theoreticalEnd = expectedEndAt();
        settle(SessionStatus.COMPLETED, theoreticalEnd != null && theoreticalEnd.isBefore(now) ? theoreticalEnd : now,
                Math.min(plannedSeconds, elapsed));
    }

    /** Interrompt la session ; le temps de travail deja effectue reste comptabilise, sans compter comme Pomodoro termine. */
    public void cancel(Instant now) {
        if (status == SessionStatus.CANCELLED) {
            return;
        }
        if (status == SessionStatus.COMPLETED) {
            throw ApiException.conflict("SESSION_COMPLETED", "La session est deja terminee.");
        }
        settle(SessionStatus.CANCELLED, now, Math.min(plannedSeconds, elapsedSeconds(now)));
    }

    /** Cloture automatique d'une session dont l'echeance est passee (application fermee, onglet inactif...). */
    public boolean settleIfExpired(Instant now) {
        if (!hasExpired(now)) {
            return false;
        }
        settle(SessionStatus.COMPLETED, expectedEndAt(), plannedSeconds);
        return true;
    }

    private void settle(SessionStatus finalStatus, Instant at, long elapsed) {
        status = finalStatus;
        endedAt = at;
        accumulatedSeconds = (int) elapsed;
        workedSeconds = type == SessionType.WORK ? (int) elapsed : 0;
        lastResumedAt = null;
    }

    private void requireActive(String action) {
        if (!status.isActive()) {
            throw ApiException.conflict("SESSION_NOT_ACTIVE", "Impossible : la session est deja terminee (" + action + ").");
        }
    }

    public UUID getId() { return id; }
    public Task getTask() { return task; }
    public Integer getExecutionNumber() { return executionNumber; }
    public SessionType getType() { return type; }
    public SessionStatus getStatus() { return status; }
    public int getPlannedSeconds() { return plannedSeconds; }
    public int getAccumulatedSeconds() { return accumulatedSeconds; }
    public int getWorkedSeconds() { return workedSeconds; }
    public int getSequenceNumber() { return sequenceNumber; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getLastResumedAt() { return lastResumedAt; }
    public Instant getEndedAt() { return endedAt; }
    public long getVersion() { return version; }
}
