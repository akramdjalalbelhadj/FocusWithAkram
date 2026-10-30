package com.focusflow.task.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.focusflow.task.domain.Quadrant;
import com.focusflow.task.domain.TaskStatus;
import com.focusflow.task.domain.TaskTiming;

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

    public record ProjectRef(UUID id, String name, String color) {
    }

    public record SubtaskResponse(UUID id, String title, boolean done, int position, Instant createdAt) {
    }
}
