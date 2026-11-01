package com.focusflow.task.service;

import com.focusflow.common.exception.ApiException;
import com.focusflow.pomodoro.entity.PomodoroSession;
import com.focusflow.pomodoro.enums.SessionType;
import com.focusflow.pomodoro.repository.PomodoroSessionRepository;
import com.focusflow.task.dto.ExecutionResponse;
import com.focusflow.task.dto.SessionSummary;
import com.focusflow.task.dto.TimelineEvent;
import com.focusflow.task.entity.Task;
import com.focusflow.task.entity.TaskExecution;
import com.focusflow.task.enums.TimelineEventType;
import com.focusflow.task.model.TaskTiming;
import com.focusflow.task.repository.TaskExecutionRepository;
import com.focusflow.task.repository.TaskRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Chronologie et historique des cycles d'execution d'une tache. */
@Service
public class TaskHistoryService {

    /** {@code occurred} distingue un evenement deja survenu d'un evenement prevu ou non encore arrive. */

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
        events.add(new TimelineEvent(TimelineEventType.CREATED, t.getCreatedAt(), true));
        events.add(planned(TimelineEventType.PLANNED_START, t.getPlannedStartAt(), now));
        events.add(new TimelineEvent(TimelineEventType.ACTUAL_START, t.getActualStartAt(), t.getActualStartAt() != null));
        events.add(planned(TimelineEventType.PLANNED_END, t.getPlannedEndAt(), now));
        events.add(new TimelineEvent(TimelineEventType.ACTUAL_END, t.getActualEndAt(), t.getActualEndAt() != null));
        events.add(new TimelineEvent(TimelineEventType.ARCHIVED, t.getArchivedAt(), t.getArchivedAt() != null));
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

    private static TimelineEvent planned(TimelineEventType type, Instant at, Instant now) {
        return new TimelineEvent(type, at, at != null && !at.isAfter(now));
    }

    private static SessionSummary summary(PomodoroSession s) {
        return new SessionSummary(s.getId(), s.getStatus(), s.getStartedAt(), s.getEndedAt(), s.getPlannedSeconds(),
                s.getWorkedSeconds());
    }
}
