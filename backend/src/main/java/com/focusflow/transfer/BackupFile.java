package com.focusflow.transfer;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.focusflow.pomodoro.SessionStatus;
import com.focusflow.pomodoro.SessionType;
import com.focusflow.task.domain.TaskStatus;

/** Format de sauvegarde JSON versionne : tout ce qui est necessaire pour restaurer l'historique. */
public record BackupFile(int version, Instant exportedAt, List<ProjectData> projects, List<TaskData> tasks,
                         List<SessionData> sessions) {

    public static final int CURRENT_VERSION = 1;

    public record ProjectData(UUID id, String name, String description, String color, String icon, Instant dueAt,
                              boolean archived, Instant createdAt) {
    }

    public record SubtaskData(String title, boolean done, int position, Instant createdAt) {
    }

    public record ExecutionData(int executionNumber, Instant plannedStartAt, Instant plannedEndAt, Instant actualStartAt,
                                Instant actualEndAt, Instant archivedAt) {
    }

    public record TaskData(UUID id, String title, String description, String notes, TaskStatus status, boolean important,
                           boolean urgent, int position, Integer estimatedMinutes, UUID projectId, List<String> tags,
                           List<SubtaskData> subtasks, Instant createdAt, Instant updatedAt, Instant plannedStartAt,
                           Instant plannedEndAt, Instant actualStartAt, Instant actualEndAt, Instant archivedAt,
                           int executionNumber, List<ExecutionData> executions) {
    }

    public record SessionData(UUID id, UUID taskId, Integer executionNumber, SessionType type, SessionStatus status,
                              int plannedSeconds, int workedSeconds, int sequenceNumber, Instant startedAt, Instant endedAt) {
    }
}
