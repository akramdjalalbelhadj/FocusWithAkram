package com.focusflow.task.model;

import com.focusflow.task.enums.Quadrant;
import com.focusflow.task.enums.TaskStatus;
import java.time.Instant;
import java.util.UUID;

/** Criteres de recherche des taches actives (non archivees). Tous les champs sont facultatifs. */
public record TaskFilter(String q, TaskStatus status, Quadrant quadrant, UUID projectId, String tag,
                         Instant dueFrom, Instant dueTo, Boolean overdue, Boolean unplanned) {

    public static TaskFilter none() {
        return new TaskFilter(null, null, null, null, null, null, null, null, null);
    }
}
