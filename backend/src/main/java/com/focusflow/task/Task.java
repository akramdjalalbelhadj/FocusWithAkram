package com.focusflow.task;

import com.focusflow.common.exception.ApiException;
import com.focusflow.project.Project;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.BatchSize;

/**
 * Tache. Porte les regles du cycle de vie (demarrage, terminaison, restauration) afin que les
 * invariants temporels soient verifies au meme endroit, independamment de la couche d'appel.
 */
@Entity
@Table(name = "task")
public class Task {

    /** Tolerance sur les horloges client/serveur pour les dates saisies "maintenant". */
    static final Duration CLOCK_SKEW = Duration.ofMinutes(2);

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String title;

    private String description;

    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.TODO;

    @Column(nullable = false)
    private boolean important;

    @Column(nullable = false)
    private boolean urgent;

    @Column(nullable = false)
    private int position;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "planned_start_at")
    private Instant plannedStartAt;

    @Column(name = "planned_end_at")
    private Instant plannedEndAt;

    @Column(name = "actual_start_at")
    private Instant actualStartAt;

    @Column(name = "actual_end_at")
    private Instant actualEndAt;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(name = "execution_number", nullable = false)
    private int executionNumber = 1;

    @ManyToMany
    @JoinTable(name = "task_tag", joinColumns = @JoinColumn(name = "task_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @BatchSize(size = 50)
    private Set<Tag> tags = new HashSet<>();

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC, createdAt ASC")
    @BatchSize(size = 50)
    private List<Subtask> subtasks = new ArrayList<>();

    @Version
    private long version;

    protected Task() {
    }

    public Task(String title, Instant now) {
        this.title = title;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** Etat complet d'une tache lors d'une importation de sauvegarde. */
    public record Snapshot(UUID id, String title, String description, String notes, TaskStatus status, boolean important,
                           boolean urgent, int position, Integer estimatedMinutes, Instant createdAt, Instant updatedAt,
                           Instant plannedStartAt, Instant plannedEndAt, Instant actualStartAt, Instant actualEndAt,
                           Instant archivedAt, int executionNumber) {
    }

    /** Reconstruit une tache depuis une sauvegarde en verifiant les memes invariants que le cycle de vie. */
    public static Task fromSnapshot(Snapshot s) {
        if (s.title() == null || s.title().isBlank() || s.title().length() > 200) {
            throw ApiException.rule("IMPORT_INVALID_TASK", "Titre manquant ou trop long.");
        }
        if (s.status() == null || s.createdAt() == null) {
            throw ApiException.rule("IMPORT_INVALID_TASK", "Statut ou date de creation manquant : " + s.title());
        }
        Task t = new Task(s.title().strip(), s.createdAt());
        if (s.id() != null) {
            t.id = s.id();
        }
        t.description = s.description();
        t.notes = s.notes();
        t.status = s.status();
        t.important = s.important();
        t.urgent = s.urgent();
        t.position = s.position();
        t.estimatedMinutes = s.estimatedMinutes();
        t.updatedAt = s.updatedAt() != null ? s.updatedAt() : s.createdAt();
        t.plannedStartAt = s.plannedStartAt();
        t.plannedEndAt = s.plannedEndAt();
        t.actualStartAt = s.actualStartAt();
        t.actualEndAt = s.actualEndAt();
        t.archivedAt = s.archivedAt();
        t.executionNumber = Math.max(1, s.executionNumber());
        t.validateInvariants();
        return t;
    }

    /** Verifie les invariants temporels et de statut ; ils sont aussi garantis par des contraintes en base. */
    void validateInvariants() {
        String label = "Tache '" + title + "' : ";
        if (plannedStartAt != null && plannedEndAt != null && !plannedStartAt.isBefore(plannedEndAt)) {
            throw ApiException.rule("PLANNED_DATES_INCONSISTENT", label + "le debut prevu doit preceder la fin prevue.");
        }
        if (actualStartAt != null && actualEndAt != null && actualStartAt.isAfter(actualEndAt)) {
            throw ApiException.rule("ACTUAL_DATES_INCONSISTENT", label + "le debut reel doit preceder la fin reelle.");
        }
        switch (status) {
            case TODO -> {
                if (actualEndAt != null || archivedAt != null) {
                    throw ApiException.rule("INVALID_TODO_STATE", label + "une tache a faire n'a ni fin reelle ni archivage.");
                }
            }
            case IN_PROGRESS -> {
                if (actualStartAt == null || actualEndAt != null || archivedAt != null) {
                    throw ApiException.rule("INVALID_IN_PROGRESS_STATE", label + "une tache en cours exige un debut reel et aucune fin.");
                }
            }
            case DONE -> {
                if (actualStartAt == null || actualEndAt == null || archivedAt == null) {
                    throw ApiException.rule("INVALID_DONE_STATE", label + "une tache terminee exige debut reel, fin reelle et archivage.");
                }
            }
        }
    }

    public void addImportedSubtask(String title, boolean done, int position, Instant createdAt) {
        Subtask s = new Subtask(this, title, position, createdAt);
        s.setDone(done);
        subtasks.add(s);
    }

    // ---- Cycle de vie -------------------------------------------------------------------------

    /**
     * Passe la tache en cours. La date de debut reelle n'est ecrasee que par une correction explicite
     * (retroStart) : une mise en pause puis une reprise conservent donc la date d'origine.
     */
    public void start(Instant now, Instant retroStart) {
        if (status == TaskStatus.DONE) {
            throw ApiException.rule("TASK_ALREADY_DONE", "Une tache terminee doit etre restauree avant d'etre demarree.");
        }
        if (retroStart != null) {
            requireNotFuture(retroStart, now, "La date de debut reel");
            actualStartAt = retroStart;
        } else if (actualStartAt == null) {
            actualStartAt = now;
        }
        status = TaskStatus.IN_PROGRESS;
        touch(now);
    }

    /** IN_PROGRESS -> TODO (pause). La date de debut reelle est conservee. */
    public void pause(Instant now) {
        if (status != TaskStatus.IN_PROGRESS) {
            throw ApiException.rule("TASK_NOT_IN_PROGRESS", "Seule une tache en cours peut etre remise a faire.");
        }
        status = TaskStatus.TODO;
        touch(now);
    }

    /**
     * Termine et archive la tache. Si elle n'a jamais ete demarree, le debut reel doit etre fourni
     * explicitement : il n'est jamais invente.
     */
    public void complete(Instant now, Instant explicitStart, Instant explicitEnd) {
        if (status == TaskStatus.DONE) {
            throw ApiException.conflict("TASK_ALREADY_DONE", "La tache est deja terminee.");
        }
        Instant end = explicitEnd != null ? explicitEnd : now;
        requireNotFuture(end, now, "La date de fin reelle");
        if (explicitStart != null) {
            requireNotFuture(explicitStart, now, "La date de debut reel");
            actualStartAt = explicitStart;
        }
        if (actualStartAt == null) {
            throw ApiException.rule("ACTUAL_START_REQUIRED",
                    "La tache n'a jamais ete demarree : indiquez la date de debut reel.");
        }
        if (actualStartAt.isAfter(end)) {
            throw ApiException.rule("ACTUAL_DATES_INCONSISTENT", "Le debut reel doit preceder la fin reelle.");
        }
        status = TaskStatus.DONE;
        actualEndAt = end;
        archivedAt = now;
        touch(now);
    }

    /** Rouvre une tache terminee pour un nouveau cycle ; l'historique des cycles precedents reste intact. */
    public void restore(Instant now) {
        if (status != TaskStatus.DONE) {
            throw ApiException.rule("TASK_NOT_DONE", "Seule une tache terminee peut etre restauree.");
        }
        status = TaskStatus.TODO;
        actualStartAt = null;
        actualEndAt = null;
        archivedAt = null;
        executionNumber++;
        touch(now);
    }

    public void setPlannedDates(Instant start, Instant end, Instant now) {
        if (status == TaskStatus.DONE) {
            throw ApiException.rule("PLANNED_DATES_LOCKED", "Les dates prevues d'une tache terminee ne sont plus modifiables.");
        }
        if (start != null && end != null && !start.isBefore(end)) {
            throw ApiException.rule("PLANNED_DATES_INCONSISTENT", "Le debut prevu doit preceder la fin prevue.");
        }
        plannedStartAt = start;
        plannedEndAt = end;
        touch(now);
    }

    public boolean isActive() {
        return archivedAt == null && status != TaskStatus.DONE;
    }

    public boolean isOverdue(Instant now) {
        return isActive() && plannedEndAt != null && plannedEndAt.isBefore(now);
    }

    public Quadrant getQuadrant() {
        return Quadrant.of(important, urgent);
    }

    public void moveToQuadrant(Quadrant quadrant, int newPosition, Instant now) {
        this.important = quadrant.important();
        this.urgent = quadrant.urgent();
        this.position = newPosition;
        touch(now);
    }

    // ---- Sous-taches --------------------------------------------------------------------------

    public Subtask addSubtask(String title, Instant now) {
        Subtask s = new Subtask(this, title, subtasks.size(), now);
        subtasks.add(s);
        touch(now);
        return s;
    }

    public void removeSubtask(UUID subtaskId, Instant now) {
        if (!subtasks.removeIf(s -> s.getId().equals(subtaskId))) {
            throw ApiException.notFound("Sous-tache", subtaskId);
        }
        for (int i = 0; i < subtasks.size(); i++) {
            subtasks.get(i).setPosition(i);
        }
        touch(now);
    }

    public Subtask findSubtask(UUID subtaskId) {
        return subtasks.stream().filter(s -> s.getId().equals(subtaskId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Sous-tache", subtaskId));
    }

    // ---- Utilitaires --------------------------------------------------------------------------

    public void touch(Instant now) {
        this.updatedAt = now;
    }

    private static void requireNotFuture(Instant value, Instant now, String label) {
        if (value.isAfter(now.plus(CLOCK_SKEW))) {
            throw ApiException.rule("DATE_IN_FUTURE", label + " ne peut pas etre dans le futur.");
        }
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public TaskStatus getStatus() { return status; }
    public boolean isImportant() { return important; }
    public boolean isUrgent() { return urgent; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public Integer getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(Integer estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }
    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getPlannedStartAt() { return plannedStartAt; }
    public Instant getPlannedEndAt() { return plannedEndAt; }
    public Instant getActualStartAt() { return actualStartAt; }
    public Instant getActualEndAt() { return actualEndAt; }
    public Instant getArchivedAt() { return archivedAt; }
    public int getExecutionNumber() { return executionNumber; }
    public Set<Tag> getTags() { return tags; }
    public List<Subtask> getSubtasks() { return subtasks; }
    public long getVersion() { return version; }
}
