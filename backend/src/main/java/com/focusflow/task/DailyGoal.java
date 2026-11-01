package com.focusflow.task;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Objectif prioritaire du jour (Top 3) : une tache choisie pour une date locale, a une position 0..2. */
@Entity
@Table(name = "daily_goal")
public class DailyGoal {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "goal_date", nullable = false)
    private LocalDate goalDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected DailyGoal() {
    }

    public DailyGoal(LocalDate goalDate, Task task, int position, Instant createdAt) {
        this.goalDate = goalDate;
        this.task = task;
        this.position = position;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public LocalDate getGoalDate() { return goalDate; }
    public Task getTask() { return task; }
    public int getPosition() { return position; }
    public Instant getCreatedAt() { return createdAt; }
    public void setPosition(int position) { this.position = position; }
}
