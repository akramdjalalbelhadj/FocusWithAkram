package com.focusflow.task.dto;

import com.focusflow.task.enums.Quadrant;
import com.focusflow.task.enums.TaskStatus;
import com.focusflow.task.model.TaskTiming;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        String title,
        String description,
        String notes,
        TaskStatus status,
        Quadrant quadrant,
        boolean important,
        boolean urgent,
        int position,
        Integer estimatedMinutes,
        ProjectRef project,
        List<String> tags,
        List<SubtaskResponse> subtasks,
        int subtasksDone,
        int subtasksTotal,
        Instant createdAt,
        Instant updatedAt,
        Instant plannedStartAt,
        Instant plannedEndAt,
        Instant actualStartAt,
        Instant actualEndAt,
        Instant archivedAt,
        int executionNumber,
        boolean overdue,
        long timeSpentSeconds,
        TaskTiming timing,
        long version) {

}
