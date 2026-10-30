package com.focusflow.task.application;

import java.time.Instant;
import java.util.UUID;

import com.focusflow.task.domain.Quadrant;
import com.focusflow.task.domain.TaskStatus;

/** Criteres de recherche des taches actives (non archivees). Tous les champs sont facultatifs. */
public record TaskFilter(String q, TaskStatus status, Quadrant quadrant, UUID projectId, String tag,
                         Instant dueFrom, Instant dueTo, Boolean overdue, Boolean unplanned) {

    public static TaskFilter none() {
        return new TaskFilter(null, null, null, null, null, null, null, null, null);
    }
}
