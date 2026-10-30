package com.focusflow.task.application;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.focusflow.common.ApiException;
import com.focusflow.pomodoro.PomodoroSession;
import com.focusflow.pomodoro.PomodoroSessionRepository;
import com.focusflow.pomodoro.SessionStatus;
import com.focusflow.pomodoro.SessionType;
import com.focusflow.task.domain.Task;
import com.focusflow.task.domain.TaskExecution;
import com.focusflow.task.domain.TaskTiming;
import com.focusflow.task.infrastructure.TaskExecutionRepository;
import com.focusflow.task.infrastructure.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Chronologie et historique des cycles d'execution d'une tache. */
@Service
public class TaskHistoryService {

    public enum EventType { CREATED, PLANNED_START, ACTUAL_START, PLANNED_END, ACTUAL_END, ARCHIVED }

    /** {@code occurred} distingue un evenement deja survenu d'un evenement prevu ou non encore arrive. */
    public record TimelineEvent(EventType type, Instant at, boolean occurred) {
    }

    public record SessionSummary(UUID id, SessionStatus status, Instant startedAt, Instant endedAt, int plannedSeconds,
                                 int workedSeconds) {
    }

    public record ExecutionResponse(int executionNumber, boolean current, Instant plannedStartAt, Instant plannedEndAt,
                                    Instant actualStartAt, Instant actualEndAt, Instant archivedAt, TaskTiming timing,
                                    List<SessionSummary> sessions) {
    }

    private final TaskRepository tasks;
    private final TaskExecutionRepository executions;
    private final PomodoroSessionRepository sessions;
    private final Clock clock;

    public TaskHistoryService(TaskRepository tasks, TaskExecutionRepository executions,
                              PomodoroSessionRepository sessions, Clock clock) {
        this.tasks = tasks;
        this.executions = executions;
        this.sessions = sessions;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TimelineEvent> timeline(UUID id) {
        Task t = tasks.findById(id).orElseThrow(() -> ApiException.notFound("Tache", id));
        Instant now = Instant.now(clock);
        List<TimelineEvent> events = new ArrayList<>();
        events.add(new TimelineEvent(EventType.CREATED, t.getCreatedAt(), true));
        events.add(planned(EventType.PLANNED_START, t.getPlannedStartAt(), now));
        events.add(new TimelineEvent(EventType.ACTUAL_START, t.getActualStartAt(), t.getActualStartAt() != null));
        events.add(planned(EventType.PLANNED_END, t.getPlannedEndAt(), now));
        events.add(new TimelineEvent(EventType.ACTUAL_END, t.getActualEndAt(), t.getActualEndAt() != null));
        events.add(new TimelineEvent(EventType.ARCHIVED, t.getArchivedAt(), t.getArchivedAt() != null));
        // Evenements dates par ordre chronologique ; ceux sans date (pas encore renseignes) a la fin, dans l'ordre logique.
        return events.stream()
                .sorted(Comparator.comparing((TimelineEvent e) -> e.at() == null)
                        .thenComparing(TimelineEvent::at, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(e -> e.type().ordinal()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExecutionResponse> executions(UUID id) {
        Task t = tasks.findById(id).orElseThrow(() -> ApiException.notFound("Tache", id));
        Map<Integer, List<SessionSummary>> byExecution = sessions.findByTaskIdAndTypeOrderByStartedAtAsc(id, SessionType.WORK)
                .stream()
                .filter(s -> s.getExecutionNumber() != null)
                .collect(Collectors.groupingBy(PomodoroSession::getExecutionNumber,
                        Collectors.mapping(TaskHistoryService::summary, Collectors.toList())));
        List<ExecutionResponse> result = new ArrayList<>();
        for (TaskExecution e : executions.findByTaskIdOrderByExecutionNumberAsc(id)) {
            List<SessionSummary> list = byExecution.getOrDefault(e.getExecutionNumber(), List.of());
            result.add(new ExecutionResponse(e.getExecutionNumber(), false, e.getPlannedStartAt(), e.getPlannedEndAt(),
                    e.getActualStartAt(), e.getActualEndAt(), e.getArchivedAt(),
                    TaskTiming.compute(e.getPlannedStartAt(), e.getPlannedEndAt(), e.getActualStartAt(), e.getActualEndAt(),
                            list.stream().mapToLong(SessionSummary::workedSeconds).sum()),
                    list));
        }
        if (t.isActive()) {
            List<SessionSummary> list = byExecution.getOrDefault(t.getExecutionNumber(), List.of());
            result.add(new ExecutionResponse(t.getExecutionNumber(), true, t.getPlannedStartAt(), t.getPlannedEndAt(),
                    t.getActualStartAt(), null, null,
                    TaskTiming.compute(t.getPlannedStartAt(), t.getPlannedEndAt(), t.getActualStartAt(), null,
                            list.stream().mapToLong(SessionSummary::workedSeconds).sum()),
                    list));
        }
        return result;
    }

    private static TimelineEvent planned(EventType type, Instant at, Instant now) {
        return new TimelineEvent(type, at, at != null && !at.isAfter(now));
    }

    private static SessionSummary summary(PomodoroSession s) {
        return new SessionSummary(s.getId(), s.getStatus(), s.getStartedAt(), s.getEndedAt(), s.getPlannedSeconds(),
                s.getWorkedSeconds());
    }
}
