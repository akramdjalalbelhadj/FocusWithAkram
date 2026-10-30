package com.focusflow.task.application;

import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.focusflow.pomodoro.PomodoroSessionRepository;
import com.focusflow.task.api.TaskResponse;
import com.focusflow.task.domain.Subtask;
import com.focusflow.task.domain.Tag;
import com.focusflow.task.domain.Task;
import com.focusflow.task.domain.TaskTiming;
import org.springframework.stereotype.Component;

/** Convertit les entites en DTO en agregeant le temps travaille par un seul appel groupe (pas de N+1). */
@Component
public class TaskMapper {

    private final PomodoroSessionRepository sessions;
    private final Clock clock;

    public TaskMapper(PomodoroSessionRepository sessions, Clock clock) {
        this.sessions = sessions;
        this.clock = clock;
    }

    private record Worked(Map<UUID, Long> total, Map<String, Long> perExecution) {
    }

    public TaskResponse toResponse(Task task) {
        return toResponses(List.of(task)).getFirst();
    }

    public List<TaskResponse> toResponses(Collection<Task> tasks) {
        if (tasks.isEmpty()) {
            return List.of();
        }
        Worked worked = worked(tasks.stream().map(Task::getId).toList());
        Instant now = Instant.now(clock);
        return tasks.stream().map(t -> map(t, worked, now)).toList();
    }

    private Worked worked(Collection<UUID> ids) {
        Map<UUID, Long> total = new HashMap<>();
        Map<String, Long> perExecution = new HashMap<>();
        for (Object[] row : sessions.sumWorkedByTaskIds(ids)) {
            UUID taskId = (UUID) row[0];
            long sum = ((Number) row[2]).longValue();
            total.merge(taskId, sum, Long::sum);
            if (row[1] != null) {
                perExecution.put(key(taskId, ((Number) row[1]).intValue()), sum);
            }
        }
        return new Worked(total, perExecution);
    }

    private static String key(UUID taskId, int execution) {
        return taskId + "#" + execution;
    }

    private TaskResponse map(Task t, Worked worked, Instant now) {
        List<TaskResponse.SubtaskResponse> subtasks = t.getSubtasks().stream()
                .sorted(Comparator.comparingInt(Subtask::getPosition))
                .map(s -> new TaskResponse.SubtaskResponse(s.getId(), s.getTitle(), s.isDone(), s.getPosition(), s.getCreatedAt()))
                .toList();
        int done = (int) subtasks.stream().filter(TaskResponse.SubtaskResponse::done).count();
        long active = worked.perExecution().getOrDefault(key(t.getId(), t.getExecutionNumber()), 0L);
        TaskTiming timing = TaskTiming.compute(t.getPlannedStartAt(), t.getPlannedEndAt(), t.getActualStartAt(),
                t.getActualEndAt(), active);
        return new TaskResponse(t.getId(), t.getTitle(), t.getDescription(), t.getNotes(), t.getStatus(), t.getQuadrant(),
                t.isImportant(), t.isUrgent(), t.getPosition(), t.getEstimatedMinutes(),
                t.getProject() == null ? null
                        : new TaskResponse.ProjectRef(t.getProject().getId(), t.getProject().getName(), t.getProject().getColor()),
                t.getTags().stream().map(Tag::getName).sorted(String.CASE_INSENSITIVE_ORDER).toList(),
                subtasks, done, subtasks.size(), t.getCreatedAt(), t.getUpdatedAt(), t.getPlannedStartAt(),
                t.getPlannedEndAt(), t.getActualStartAt(), t.getActualEndAt(), t.getArchivedAt(), t.getExecutionNumber(),
                t.isOverdue(now), worked.total().getOrDefault(t.getId(), 0L), timing, t.getVersion());
    }
}
