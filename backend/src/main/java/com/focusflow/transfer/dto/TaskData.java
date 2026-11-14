package com.focusflow.transfer.dto;

import com.focusflow.task.TaskStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Tache d'une sauvegarde. {@code projectIds} (v6) liste tous ses projets, le principal d'abord ; absent dans
 * les versions anterieures, ou seul {@code projectId} est lu.
 */
public record TaskData(UUID id, String title, String description, String notes, TaskStatus status, boolean important,
                       boolean urgent, int position, Integer estimatedMinutes, UUID projectId, List<String> tags,
                       List<SubtaskData> subtasks, Instant createdAt, Instant updatedAt, Instant plannedStartAt,
                       Instant plannedEndAt, Instant actualStartAt, Instant actualEndAt, Instant archivedAt,
                       int executionNumber, List<ExecutionData> executions, UUID sourceNoteId,
                       List<UUID> projectIds) {
}
