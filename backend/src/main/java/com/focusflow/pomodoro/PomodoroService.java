package com.focusflow.pomodoro;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.Optional;
import java.util.UUID;

import com.focusflow.common.ApiException;
import com.focusflow.common.PageResponse;
import com.focusflow.settings.SettingsService;
import com.focusflow.settings.UserSettings;
import com.focusflow.task.domain.Task;
import com.focusflow.task.domain.TaskStatus;
import com.focusflow.task.infrastructure.TaskRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cycle de vie des sessions Pomodoro. Le serveur est la seule source de temps : chaque reponse porte
 * {@code serverTime} afin que le client corrige l'ecart de son horloge locale (voir README, "Horloges").
 */
@Service
public class PomodoroService {

    public record NextSession(SessionType type, int plannedSeconds, int sequenceNumber) {
    }

    public record SessionResponse(UUID id, SessionType type, SessionStatus status, UUID taskId, String taskTitle,
                                  int plannedSeconds, long elapsedSeconds, long remainingSeconds, int workedSeconds,
                                  int sequenceNumber, Instant startedAt, Instant lastResumedAt, Instant expectedEndAt,
                                  Instant endedAt, NextSession next) {
    }

    public record SessionState(SessionResponse session, Instant serverTime) {
    }

    public record StartRequest(SessionType type, UUID taskId, Integer plannedSeconds) {
    }

    private final PomodoroSessionRepository sessions;
    private final TaskRepository tasks;
    private final SettingsService settings;
    private final Clock clock;

    public PomodoroService(PomodoroSessionRepository sessions, TaskRepository tasks, SettingsService settings, Clock clock) {
        this.sessions = sessions;
        this.tasks = tasks;
        this.settings = settings;
        this.clock = clock;
    }

    /** Session active (en cours ou en pause) ; cloture au passage une session dont l'echeance est passee. */
    @Transactional
    public SessionState active() {
        Instant now = now();
        Optional<PomodoroSession> active = sessions.findFirstByStatusIn(EnumSet.of(SessionStatus.RUNNING, SessionStatus.PAUSED));
        if (active.isPresent() && active.get().settleIfExpired(now)) {
            // La session vient d'etre terminee automatiquement : on la renvoie comme telle, une seule fois.
            return new SessionState(view(active.get(), now), now);
        }
        return new SessionState(active.map(s -> view(s, now)).orElse(null), now);
    }

    @Transactional
    public SessionState start(StartRequest req) {
        Instant now = now();
        sessions.findFirstByStatusIn(EnumSet.of(SessionStatus.RUNNING, SessionStatus.PAUSED)).ifPresent(existing -> {
            if (!existing.settleIfExpired(now)) {
                throw ApiException.conflict("SESSION_ALREADY_ACTIVE", "Une session est deja en cours.");
            }
            sessions.flush();
        });
        UserSettings cfg = settings.get();
        SessionType type = req.type() == null ? SessionType.WORK : req.type();
        int planned = req.plannedSeconds() != null ? validatePlanned(req.plannedSeconds()) : defaultSeconds(cfg, type);

        Task task = null;
        if (req.taskId() != null) {
            if (type != SessionType.WORK) {
                throw ApiException.rule("TASK_ON_BREAK", "Une pause ne peut pas etre associee a une tache.");
            }
            task = tasks.findById(req.taskId()).orElseThrow(() -> ApiException.notFound("Tache", req.taskId()));
            if (!task.isActive()) {
                throw ApiException.rule("TASK_NOT_ACTIVE", "Impossible de travailler sur une tache terminee.");
            }
            // Travailler sur une tache la fait demarrer (evenement reel) ; une tache deja demarree garde sa date.
            if (task.getStatus() == TaskStatus.TODO) {
                task.start(now, null);
            }
        }
        int sequence = (int) (completedWorkToday(now) % cfg.getSessionsBeforeLong()) + 1;
        PomodoroSession session = sessions.save(new PomodoroSession(type, planned, sequence, task, now));
        return new SessionState(view(session, now), now);
    }

    @Transactional
    public SessionState pause(UUID id) {
        Instant now = now();
        PomodoroSession s = load(id);
        if (!s.settleIfExpired(now)) {
            s.pause(now);
        }
        return new SessionState(view(s, now), now);
    }

    @Transactional
    public SessionState resume(UUID id) {
        Instant now = now();
        PomodoroSession s = load(id);
        if (!s.settleIfExpired(now)) {
            s.resume(now);
        }
        return new SessionState(view(s, now), now);
    }

    @Transactional
    public SessionState complete(UUID id) {
        Instant now = now();
        PomodoroSession s = load(id);
        s.complete(now);
        return new SessionState(view(s, now), now);
    }

    /** Interruption volontaire : le temps deja travaille est conserve mais la session n'est pas "terminee". */
    @Transactional
    public SessionState cancel(UUID id) {
        Instant now = now();
        PomodoroSession s = load(id);
        if (!s.settleIfExpired(now)) {
            s.cancel(now);
        }
        return new SessionState(view(s, now), now);
    }

    @Transactional(readOnly = true)
    public PageResponse<SessionResponse> history(int page, int size) {
        Instant now = now();
        var result = sessions.findAllByOrderByStartedAtDesc(PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
        return PageResponse.of(result, result.getContent().stream().map(s -> view(s, now)).toList());
    }

    public record HistoryEntry(UUID id, SessionStatus status, UUID taskId, String taskTitle, Instant startedAt,
                               Instant endedAt, int plannedSeconds, int workedSeconds) {
    }

    public record DayHistory(LocalDate date, long workedSeconds, int completedSessions, int interruptedSessions,
                             java.util.List<HistoryEntry> sessions) {
    }

    /**
     * Historique des Pomodoros de travail regroupes par jour (fuseau de l'utilisateur, jour de fin), du plus
     * recent au plus ancien. Par defaut les 30 derniers jours ; chaque entree porte date, heure et duree.
     */
    @Transactional(readOnly = true)
    public java.util.List<DayHistory> dailyHistory(LocalDate from, LocalDate to) {
        ZoneId zone = settings.zone();
        LocalDate end = to != null ? to : LocalDate.ofInstant(now(), zone);
        LocalDate start = from != null ? from : end.minusDays(29);
        if (start.isAfter(end) || java.time.temporal.ChronoUnit.DAYS.between(start, end) > 400) {
            throw new IllegalArgumentException("Periode invalide (400 jours maximum).");
        }
        var byDay = new java.util.TreeMap<LocalDate, java.util.List<PomodoroSession>>(java.util.Comparator.reverseOrder());
        for (PomodoroSession s : sessions.findFinishedWorkBetween(start.atStartOfDay(zone).toInstant(),
                end.plusDays(1).atStartOfDay(zone).toInstant())) {
            byDay.computeIfAbsent(LocalDate.ofInstant(s.getEndedAt(), zone), d -> new java.util.ArrayList<>()).add(s);
        }
        return byDay.entrySet().stream().map(e -> {
            var list = e.getValue().stream()
                    .sorted(java.util.Comparator.comparing(PomodoroSession::getStartedAt).reversed())
                    .map(s -> new HistoryEntry(s.getId(), s.getStatus(), s.getTask() == null ? null : s.getTask().getId(),
                            s.getTask() == null ? null : s.getTask().getTitle(), s.getStartedAt(), s.getEndedAt(),
                            s.getPlannedSeconds(), s.getWorkedSeconds()))
                    .toList();
            return new DayHistory(e.getKey(), list.stream().mapToLong(HistoryEntry::workedSeconds).sum(),
                    (int) list.stream().filter(h -> h.status() == SessionStatus.COMPLETED).count(),
                    (int) list.stream().filter(h -> h.status() == SessionStatus.CANCELLED).count(), list);
        }).toList();
    }

    private PomodoroSession load(UUID id) {
        return sessions.findById(id).orElseThrow(() -> ApiException.notFound("Session", id));
    }

    private long completedWorkToday(Instant now) {
        ZoneId zone = settings.zone();
        LocalDate today = LocalDate.ofInstant(now, zone);
        return sessions.countByTypeAndStatusAndEndedAtGreaterThanEqualAndEndedAtLessThan(SessionType.WORK,
                SessionStatus.COMPLETED, today.atStartOfDay(zone).toInstant(), today.plusDays(1).atStartOfDay(zone).toInstant());
    }

    private SessionResponse view(PomodoroSession s, Instant now) {
        UserSettings cfg = settings.get();
        NextSession next;
        if (s.getType() == SessionType.WORK) {
            long done = completedWorkToday(now) + (s.getStatus() == SessionStatus.COMPLETED ? 0 : 1);
            SessionType breakType = done % cfg.getSessionsBeforeLong() == 0 ? SessionType.LONG_BREAK : SessionType.SHORT_BREAK;
            next = new NextSession(breakType, defaultSeconds(cfg, breakType), s.getSequenceNumber());
        } else {
            next = new NextSession(SessionType.WORK, defaultSeconds(cfg, SessionType.WORK),
                    (int) (completedWorkToday(now) % cfg.getSessionsBeforeLong()) + 1);
        }
        Task t = s.getTask();
        return new SessionResponse(s.getId(), s.getType(), s.getStatus(), t == null ? null : t.getId(),
                t == null ? null : t.getTitle(), s.getPlannedSeconds(), s.elapsedSeconds(now), s.remainingSeconds(now),
                s.getWorkedSeconds(), s.getSequenceNumber(), s.getStartedAt(), s.getLastResumedAt(), s.expectedEndAt(),
                s.getEndedAt(), next);
    }

    private static int defaultSeconds(UserSettings cfg, SessionType type) {
        return 60 * switch (type) {
            case WORK -> cfg.getWorkMinutes();
            case SHORT_BREAK -> cfg.getShortBreakMinutes();
            case LONG_BREAK -> cfg.getLongBreakMinutes();
        };
    }

    private static int validatePlanned(int seconds) {
        if (seconds < 60 || seconds > 3 * 3600) {
            throw new IllegalArgumentException("La duree doit etre comprise entre 1 minute et 3 heures.");
        }
        return seconds;
    }

    private Instant now() {
        return Instant.now(clock);
    }
}
