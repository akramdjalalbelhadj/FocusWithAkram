package com.focusflow.task;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Cycle d'execution termine d'une tache. Une tache restauree puis terminee de nouveau produit
 * un nouveau cycle ; les cycles precedents sont conserves tels quels.
 */
@Entity
@Table(name = "task_execution")
public class TaskExecution {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(name = "execution_number", nullable = false)
    private int executionNumber;

    @Column(name = "planned_start_at")
    private Instant plannedStartAt;

    @Column(name = "planned_end_at")
    private Instant plannedEndAt;

    @Column(name = "actual_start_at", nullable = false)
    private Instant actualStartAt;

    @Column(name = "actual_end_at", nullable = false)
    private Instant actualEndAt;

    @Column(name = "archived_at", nullable = false)
    private Instant archivedAt;

    protected TaskExecution() {
    }

    public TaskExecution(Task task) {
        this.task = task;
        this.executionNumber = task.getExecutionNumber();
        this.plannedStartAt = task.getPlannedStartAt();
        this.plannedEndAt = task.getPlannedEndAt();
        this.actualStartAt = task.getActualStartAt();
        this.actualEndAt = task.getActualEndAt();
        this.archivedAt = task.getArchivedAt();
    }

    public static TaskExecution imported(Task task, int executionNumber, Instant plannedStartAt, Instant plannedEndAt,
                                         Instant actualStartAt, Instant actualEndAt, Instant archivedAt) {
        TaskExecution e = new TaskExecution();
        e.task = task;
        e.executionNumber = executionNumber;
        e.plannedStartAt = plannedStartAt;
        e.plannedEndAt = plannedEndAt;
        e.actualStartAt = actualStartAt;
        e.actualEndAt = actualEndAt;
        e.archivedAt = archivedAt;
        return e;
    }

    public UUID getId() { return id; }
    public Task getTask() { return task; }
    public int getExecutionNumber() { return executionNumber; }
    public Instant getPlannedStartAt() { return plannedStartAt; }
    public Instant getPlannedEndAt() { return plannedEndAt; }
    public Instant getActualStartAt() { return actualStartAt; }
    public Instant getActualEndAt() { return actualEndAt; }
    public Instant getArchivedAt() { return archivedAt; }
}
