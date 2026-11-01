package com.focusflow.task;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Component;

/** Acces en lecture aux taches actives pour les modules voisins (matrice, tableau de bord). */
@Component
public class TaskQueries {

    private final TaskRepository tasks;
    private final Clock clock;

    public TaskQueries(TaskRepository tasks, Clock clock) {
        this.tasks = tasks;
        this.clock = clock;
    }

    public List<Task> active(TaskFilter filter) {
        return tasks.findAll(TaskSpecifications.active(filter, Instant.now(clock)));
    }
}
