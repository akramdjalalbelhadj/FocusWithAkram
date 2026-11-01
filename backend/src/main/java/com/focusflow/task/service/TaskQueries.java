package com.focusflow.task.service;

import com.focusflow.task.entity.Task;
import com.focusflow.task.model.TaskFilter;
import com.focusflow.task.repository.TaskRepository;
import com.focusflow.task.specification.TaskSpecifications;
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
