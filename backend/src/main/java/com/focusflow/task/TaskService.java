package com.focusflow.task;

import com.focusflow.common.PageResponse;
import com.focusflow.common.exception.ApiException;
import com.focusflow.common.Patch;
import com.focusflow.project.ProjectRepository;
import com.focusflow.settings.SettingsService;
import com.focusflow.task.dto.CreateTaskRequest;
import com.focusflow.task.dto.TaskResponse;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cas d'usage sur les taches actives : CRUD, matrice, statut, sous-taches et cycle de vie. */
@Service
public class TaskService {

    private static final int MAX_TAGS = 10;
    private static final Set<String> SORTABLE = Set.of("createdAt", "updatedAt", "title", "plannedEndAt", "plannedStartAt",
            "position", "status");

    private final TaskRepository tasks;
    private final TagRepository tags;
    private final TaskExecutionRepository executions;
    private final ProjectRepository projects;
    private final SettingsService settings;
    private final TaskMapper mapper;
    private final Clock clock;

    public TaskService(TaskRepository tasks, TagRepository tags, TaskExecutionRepository executions,
                       ProjectRepository projects, SettingsService settings, TaskMapper mapper, Clock clock) {
        this.tasks = tasks;
        this.tags = tags;
        this.executions = executions;
        this.projects = projects;
        this.settings = settings;
        this.mapper = mapper;
        this.clock = clock;
    }

    // ---- Lecture ------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> search(TaskFilter filter, int page, int size, String sortBy, boolean descending) {
        String sortField = SORTABLE.contains(sortBy) ? sortBy : "createdAt";
        Sort sort = Sort.by(descending ? Sort.Direction.DESC : Sort.Direction.ASC, sortField).and(Sort.by("id"));
        Page<Task> result = tasks.findAll(TaskSpecifications.active(filter, now()),
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 200), sort));
        return PageResponse.of(result, mapper.toResponses(result.getContent()));
    }

    @Transactional(readOnly = true)
    public TaskResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public List<String> listTags() {
        return tags.findAll().stream().map(Tag::getName).sorted(String.CASE_INSENSITIVE_ORDER).toList();
    }

    // ---- Creation / modification --------------------------------------------------------------

    @Transactional
    public TaskResponse create(CreateTaskRequest req) {
        Instant now = now();
        Task task = new Task(req.title().strip(), now);
        Quadrant q = req.quadrant() == null ? Quadrant.Q2 : req.quadrant();
        task.moveToQuadrant(q, tasks.maxPosition(q.important(), q.urgent()) + 1, now);
        task.setDescription(blankToNull(req.description()));
        task.setNotes(blankToNull(req.notes()));
        task.setEstimatedMinutes(req.estimatedMinutes());
        task.setPlannedDates(req.plannedStartAt(), req.plannedEndAt(), now);
        if (req.projectId() != null) {
            task.setProject(projects.findById(req.projectId()).orElseThrow(() -> ApiException.notFound("Projet", req.projectId())));
        }
        applyTags(task, req.tags());
        if (req.subtasks() != null) {
            req.subtasks().stream().filter(s -> s != null && !s.isBlank()).forEach(s -> task.addSubtask(s.strip(), now));
        }
        return mapper.toResponse(tasks.save(task));
    }

    /** Modification partielle : un champ absent est conserve, un champ present a null est efface. */
    @Transactional
    public TaskResponse update(UUID id, Patch p) {
        Task task = find(id);
        Instant now = now();
        if (p.has("title")) {
            String title = p.string("title");
            if (title == null || title.isBlank() || title.strip().length() > 200) {
                throw new IllegalArgumentException("Le titre est obligatoire (200 caracteres maximum).");
            }
            task.setTitle(title.strip());
        }
        if (p.has("description")) task.setDescription(blankToNull(p.string("description")));
        if (p.has("notes")) task.setNotes(blankToNull(p.string("notes")));
        if (p.has("estimatedMinutes")) {
            Integer m = p.integer("estimatedMinutes");
            if (m != null && (m < 1 || m > 100_000)) {
                throw new IllegalArgumentException("L'estimation doit etre comprise entre 1 et 100000 minutes.");
            }
            task.setEstimatedMinutes(m);
        }
        if (p.has("plannedStartAt") || p.has("plannedEndAt")) {
            task.setPlannedDates(p.has("plannedStartAt") ? p.instant("plannedStartAt") : task.getPlannedStartAt(),
                    p.has("plannedEndAt") ? p.instant("plannedEndAt") : task.getPlannedEndAt(), now);
        }
        if (p.has("projectId")) {
            UUID projectId = p.uuid("projectId");
            task.setProject(projectId == null ? null
                    : projects.findById(projectId).orElseThrow(() -> ApiException.notFound("Projet", projectId)));
        }
        if (p.has("tags")) applyTags(task, p.strings("tags"));
        if (p.has("quadrant")) {
            Quadrant q = parseQuadrant(p.string("quadrant"));
            if (q != task.getQuadrant()) {
                task.moveToQuadrant(q, tasks.maxPosition(q.important(), q.urgent()) + 1, now);
            }
        }
        task.touch(now);
        return mapper.toResponse(task);
    }

    @Transactional
    public void delete(UUID id) {
        tasks.delete(find(id));
    }

    @Transactional
    public TaskResponse duplicate(UUID id) {
        Task src = find(id);
        Instant now = now();
        Task copy = new Task(src.getTitle() + " (copie)", now);
        Quadrant q = src.getQuadrant();
        copy.moveToQuadrant(q, tasks.maxPosition(q.important(), q.urgent()) + 1, now);
        copy.setDescription(src.getDescription());
        copy.setNotes(src.getNotes());
        copy.setEstimatedMinutes(src.getEstimatedMinutes());
        copy.setProject(src.getProject());
        copy.getTags().addAll(src.getTags());
        src.getSubtasks().forEach(s -> copy.addSubtask(s.getTitle(), now));
        return mapper.toResponse(tasks.save(copy));
    }

    // ---- Matrice : quadrant et ordre ----------------------------------------------------------

    @Transactional
    public TaskResponse moveToQuadrant(UUID id, Quadrant quadrant) {
        Task task = findActive(id);
        if (task.getQuadrant() != quadrant) {
            task.moveToQuadrant(quadrant, tasks.maxPosition(quadrant.important(), quadrant.urgent()) + 1, now());
        }
        return mapper.toResponse(task);
    }

    /**
     * Enregistre l'ordre d'un quadrant : chaque tache listee rejoint {@code quadrant} a l'index donne.
     * Couvre a la fois le reordonnancement interne et le glisser-deposer entre quadrants (et son annulation).
     */
    @Transactional
    public List<TaskResponse> reorder(Quadrant quadrant, List<UUID> orderedIds) {
        if (new LinkedHashSet<>(orderedIds).size() != orderedIds.size()) {
            throw new IllegalArgumentException("La liste contient des identifiants en double.");
        }
        Map<UUID, Task> byId = tasks.findAllWithProjectByIdIn(orderedIds).stream()
                .collect(Collectors.toMap(Task::getId, Function.identity()));
        Instant now = now();
        List<Task> ordered = new ArrayList<>();
        for (int i = 0; i < orderedIds.size(); i++) {
            Task t = byId.get(orderedIds.get(i));
            if (t == null) {
                throw ApiException.notFound("Tache", orderedIds.get(i));
            }
            if (!t.isActive()) {
                throw ApiException.rule("TASK_NOT_ACTIVE", "Une tache terminee ne peut pas etre deplacee dans la matrice.");
            }
            t.moveToQuadrant(quadrant, i, now);
            ordered.add(t);
        }
        return mapper.toResponses(ordered);
    }

    // ---- Statut et cycle de vie ---------------------------------------------------------------

    @Transactional
    public TaskResponse changeStatus(UUID id, TaskStatus target, Instant actualStartAt) {
        Task task = find(id);
        switch (target) {
            case IN_PROGRESS -> task.start(now(), actualStartAt);
            case DONE -> completeInternal(task, actualStartAt, null);
            case TODO -> {
                if (task.getStatus() == TaskStatus.DONE) {
                    restoreInternal(task);
                } else if (task.getStatus() == TaskStatus.IN_PROGRESS) {
                    task.pause(now());
                }
            }
        }
        return mapper.toResponse(task);
    }

    @Transactional
    public TaskResponse start(UUID id, Instant retroactiveStart) {
        Task task = find(id);
        task.start(now(), retroactiveStart);
        return mapper.toResponse(task);
    }

    @Transactional
    public TaskResponse complete(UUID id, Instant actualStartAt, Instant actualEndAt) {
        Task task = find(id);
        completeInternal(task, actualStartAt, actualEndAt);
        return mapper.toResponse(task);
    }

    @Transactional
    public TaskResponse restore(UUID id) {
        Task task = find(id);
        restoreInternal(task);
        return mapper.toResponse(task);
    }

    /** Termine, archive et enregistre le cycle d'execution en une seule transaction. */
    private void completeInternal(Task task, Instant actualStartAt, Instant actualEndAt) {
        task.complete(now(), actualStartAt, actualEndAt);
        executions.save(new TaskExecution(task));
    }

    private void restoreInternal(Task task) {
        task.restore(now());
        Quadrant q = task.getQuadrant();
        task.setPosition(tasks.maxPosition(q.important(), q.urgent()) + 1);
    }

    // ---- Sous-taches --------------------------------------------------------------------------

    @Transactional
    public TaskResponse addSubtask(UUID taskId, String title) {
        if (title == null || title.isBlank() || title.strip().length() > 200) {
            throw new IllegalArgumentException("Le titre de la sous-tache est obligatoire (200 caracteres maximum).");
        }
        Task task = find(taskId);
        task.addSubtask(title.strip(), now());
        return mapper.toResponse(task);
    }

    @Transactional
    public TaskResponse updateSubtask(UUID taskId, UUID subtaskId, Patch p) {
        Task task = find(taskId);
        Subtask sub = task.findSubtask(subtaskId);
        Instant now = now();
        if (p.has("title")) {
            String title = p.string("title");
            if (title == null || title.isBlank() || title.strip().length() > 200) {
                throw new IllegalArgumentException("Le titre de la sous-tache est obligatoire (200 caracteres maximum).");
            }
            sub.setTitle(title.strip());
        }
        if (p.has("done")) {
            sub.setDone(Boolean.TRUE.equals(p.bool("done")));
            applySubtaskProgress(task, now);
        }
        task.touch(now);
        return mapper.toResponse(task);
    }

    @Transactional
    public TaskResponse deleteSubtask(UUID taskId, UUID subtaskId) {
        Task task = find(taskId);
        task.removeSubtask(subtaskId, now());
        return mapper.toResponse(task);
    }

    /** Option explicite : la progression des sous-taches fait avancer le statut du parent. Desactivee par defaut. */
    private void applySubtaskProgress(Task task, Instant now) {
        if (!settings.get().isSubtasksCompleteParent() || !task.isActive() || task.getSubtasks().isEmpty()) {
            return;
        }
        boolean all = task.getSubtasks().stream().allMatch(Subtask::isDone);
        boolean any = task.getSubtasks().stream().anyMatch(Subtask::isDone);
        if (all) {
            completeInternal(task, null, null);
        } else if (any && task.getStatus() == TaskStatus.TODO) {
            task.start(now, null);
        }
    }

    // ---- Utilitaires --------------------------------------------------------------------------

    private void applyTags(Task task, List<String> names) {
        Set<String> wanted = new LinkedHashSet<>();
        if (names != null) {
            for (String raw : names) {
                String n = raw == null ? "" : raw.strip();
                if (n.isEmpty()) {
                    continue;
                }
                if (n.length() > 40) {
                    throw new IllegalArgumentException("Une etiquette ne peut pas depasser 40 caracteres.");
                }
                wanted.add(n);
            }
        }
        if (wanted.size() > MAX_TAGS) {
            throw new IllegalArgumentException("Une tache ne peut pas avoir plus de " + MAX_TAGS + " etiquettes.");
        }
        task.getTags().clear();
        for (String name : wanted) {
            task.getTags().add(tags.findByNameIgnoreCase(name).orElseGet(() -> tags.save(new Tag(name))));
        }
    }

    private Task find(UUID id) {
        return tasks.findById(id).orElseThrow(() -> ApiException.notFound("Tache", id));
    }

    private Task findActive(UUID id) {
        Task t = find(id);
        if (!t.isActive()) {
            throw ApiException.rule("TASK_NOT_ACTIVE", "Cette tache est terminee : restaurez-la d'abord.");
        }
        return t;
    }

    static Quadrant parseQuadrant(String raw) {
        try {
            return Quadrant.valueOf(String.valueOf(raw));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Quadrant invalide : " + raw + " (attendu Q1, Q2, Q3 ou Q4).");
        }
    }

    private Instant now() {
        return Instant.now(clock);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
