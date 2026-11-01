package com.focusflow.transfer;

import com.focusflow.common.exception.ApiException;
import com.focusflow.pomodoro.PomodoroSession;
import com.focusflow.pomodoro.PomodoroSessionRepository;
import com.focusflow.project.Project;
import com.focusflow.project.ProjectRepository;
import com.focusflow.task.Subtask;
import com.focusflow.task.Tag;
import com.focusflow.task.Task;
import com.focusflow.task.TaskExecution;
import com.focusflow.task.TagRepository;
import com.focusflow.task.TaskExecutionRepository;
import com.focusflow.task.TaskRepository;
import com.focusflow.transfer.dto.BackupFile;
import com.focusflow.transfer.dto.ExecutionData;
import com.focusflow.transfer.dto.ImportReport;
import com.focusflow.transfer.dto.ProjectData;
import com.focusflow.transfer.dto.SessionData;
import com.focusflow.transfer.dto.SubtaskData;
import com.focusflow.transfer.dto.TaskData;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Export (CSV / JSON / sauvegarde complete) et import JSON valide avec gestion des doublons. */
@Service
public class TransferService {

    private static final int MAX_ERRORS = 50;

    private final TaskRepository tasks;
    private final ProjectRepository projects;
    private final TagRepository tags;
    private final TaskExecutionRepository executions;
    private final PomodoroSessionRepository sessions;
    private final Clock clock;

    public TransferService(TaskRepository tasks, ProjectRepository projects, TagRepository tags,
                           TaskExecutionRepository executions, PomodoroSessionRepository sessions, Clock clock) {
        this.tasks = tasks;
        this.projects = projects;
        this.tags = tags;
        this.executions = executions;
        this.sessions = sessions;
        this.clock = clock;
    }

    // ---- Export -------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public BackupFile backup() {
        List<Task> all = tasks.findAll(Sort.by("createdAt"));
        return new BackupFile(BackupFile.CURRENT_VERSION, Instant.now(clock),
                projects.findAllByOrderByNameAsc().stream().map(TransferService::toData).toList(),
                all.stream().map(this::toData).toList(),
                sessions.findAll(Sort.by("startedAt")).stream().filter(s -> !s.getStatus().isActive())
                        .map(s -> new SessionData(s.getId(), s.getTask() == null ? null : s.getTask().getId(),
                                s.getExecutionNumber(), s.getType(), s.getStatus(), s.getPlannedSeconds(), s.getWorkedSeconds(),
                                s.getSequenceNumber(), s.getStartedAt(), s.getEndedAt()))
                        .toList());
    }

    @Transactional(readOnly = true)
    public List<TaskData> exportTasks(ExportScope scope) {
        return tasks.findAll(Sort.by("createdAt")).stream()
                .filter(t -> switch (scope) {
                    case ACTIVE -> t.getArchivedAt() == null;
                    case ARCHIVED -> t.getArchivedAt() != null;
                    case ALL -> true;
                })
                .map(this::toData).toList();
    }

    @Transactional(readOnly = true)
    public String exportCsv(ExportScope scope) {
        StringWriter out = new StringWriter();
        PrintWriter w = new PrintWriter(out);
        w.print("﻿");
        w.print("id,titre,description,statut,quadrant,projet,etiquettes,sous_taches_terminees,sous_taches_total,"
                + "creation,debut_prevu,fin_prevue,debut_reel,fin_reelle,archivage,estimation_minutes,temps_actif_secondes\r\n");
        List<Task> list = tasks.findAll(Sort.by("createdAt")).stream().filter(t -> switch (scope) {
            case ACTIVE -> t.getArchivedAt() == null;
            case ARCHIVED -> t.getArchivedAt() != null;
            case ALL -> true;
        }).toList();
        Map<UUID, Long> active = new HashMap<>();
        if (!list.isEmpty()) {
            for (Object[] row : sessions.sumWorkedByTaskIds(list.stream().map(Task::getId).toList())) {
                active.merge((UUID) row[0], ((Number) row[2]).longValue(), Long::sum);
            }
        }
        for (Task t : list) {
            long done = t.getSubtasks().stream().filter(Subtask::isDone).count();
            w.print(String.join(",",
                    csv(t.getId()), csv(t.getTitle()), csv(t.getDescription()), csv(t.getStatus()), csv(t.getQuadrant()),
                    csv(t.getProject() == null ? null : t.getProject().getName()),
                    csv(String.join(";", t.getTags().stream().map(Tag::getName).sorted().toList())),
                    csv(done), csv(t.getSubtasks().size()), csv(t.getCreatedAt()), csv(t.getPlannedStartAt()),
                    csv(t.getPlannedEndAt()), csv(t.getActualStartAt()), csv(t.getActualEndAt()), csv(t.getArchivedAt()),
                    csv(t.getEstimatedMinutes()), csv(active.getOrDefault(t.getId(), 0L))));
            w.print("\r\n");
        }
        w.flush();
        return out.toString();
    }

    /** Echappe un champ CSV et neutralise les formules (=, +, -, @) pour eviter l'injection dans un tableur. */
    static String csv(Object value) {
        if (value == null) {
            return "";
        }
        String s = value.toString();
        if (!s.isEmpty() && "=+-@\t\r".indexOf(s.charAt(0)) >= 0 && !(value instanceof Number)) {
            s = "'" + s;
        }
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    // ---- Import -------------------------------------------------------------------------------

    /**
     * Importe une sauvegarde. Les taches deja presentes (meme identifiant, ou meme titre et date de creation)
     * sont ignorees ; les projets sont rapproches par nom ; les erreurs d'une tache n'empechent pas les autres.
     * En mode {@code dryRun}, tout est valide mais rien n'est ecrit.
     */
    @Transactional
    public ImportReport importBackup(BackupFile file, boolean dryRun) {
        if (file == null || file.version() != BackupFile.CURRENT_VERSION) {
            throw ApiException.rule("IMPORT_UNSUPPORTED_VERSION", "Version de sauvegarde non prise en charge.");
        }
        List<String> errors = new ArrayList<>();
        int projectsCreated = 0, projectsReused = 0, tasksCreated = 0, tasksSkipped = 0, sessionsCreated = 0, sessionsSkipped = 0;

        Map<UUID, Project> projectMap = new HashMap<>();
        Map<String, Project> byName = new HashMap<>();
        projects.findAll().forEach(p -> byName.putIfAbsent(p.getName().toLowerCase(), p));
        for (ProjectData pd : nullToEmpty(file.projects())) {
            try {
                if (pd.name() == null || pd.name().isBlank()) {
                    throw new IllegalArgumentException("Projet sans nom.");
                }
                Project existing = byName.get(pd.name().strip().toLowerCase());
                if (existing != null) {
                    projectMap.put(pd.id(), existing);
                    projectsReused++;
                    continue;
                }
                Project p = new Project(pd.name().strip(), pd.createdAt() != null ? pd.createdAt() : Instant.now(clock));
                p.setDescription(pd.description());
                if (pd.color() != null && pd.color().matches("^#[0-9a-fA-F]{6}$")) p.setColor(pd.color());
                p.setIcon(pd.icon());
                p.setDueAt(pd.dueAt());
                p.setArchived(pd.archived());
                if (!dryRun) projects.save(p);
                byName.put(p.getName().toLowerCase(), p);
                projectMap.put(pd.id(), p);
                projectsCreated++;
            } catch (RuntimeException e) {
                addError(errors, "Projet : " + e.getMessage());
            }
        }

        Set<UUID> seen = new HashSet<>();
        Map<UUID, Task> importedTasks = new HashMap<>();
        for (TaskData td : nullToEmpty(file.tasks())) {
            try {
                if (td.id() != null && !seen.add(td.id())) {
                    throw new IllegalArgumentException("Identifiant en double dans le fichier : " + td.id());
                }
                boolean exists = (td.id() != null && tasks.existsById(td.id()))
                        || (td.title() != null && td.createdAt() != null
                        && tasks.existsByTitleIgnoreCaseAndCreatedAt(td.title().strip(), td.createdAt()));
                if (exists) {
                    tasksSkipped++;
                    continue;
                }
                Task t = Task.fromSnapshot(new Task.Snapshot(td.id(), td.title(), td.description(), td.notes(), td.status(),
                        td.important(), td.urgent(), td.position(), td.estimatedMinutes(), td.createdAt(), td.updatedAt(),
                        td.plannedStartAt(), td.plannedEndAt(), td.actualStartAt(), td.actualEndAt(), td.archivedAt(),
                        td.executionNumber()));
                if (td.projectId() != null) t.setProject(projectMap.get(td.projectId()));
                if (!dryRun) {
                    for (String name : nullToEmpty(td.tags())) {
                        if (name != null && !name.isBlank() && name.strip().length() <= 40) {
                            String n = name.strip();
                            t.getTags().add(tags.findByNameIgnoreCase(n).orElseGet(() -> tags.save(new Tag(n))));
                        }
                    }
                }
                for (SubtaskData sd : nullToEmpty(td.subtasks())) {
                    t.addImportedSubtask(sd.title(), sd.done(), sd.position(), sd.createdAt() != null ? sd.createdAt() : t.getCreatedAt());
                }
                if (!dryRun) {
                    tasks.save(t);
                    for (ExecutionData ed : nullToEmpty(td.executions())) {
                        executions.save(TaskExecution.imported(t, ed.executionNumber(), ed.plannedStartAt(), ed.plannedEndAt(),
                                ed.actualStartAt(), ed.actualEndAt(), ed.archivedAt()));
                    }
                }
                if (td.id() != null) importedTasks.put(td.id(), t);
                tasksCreated++;
            } catch (RuntimeException e) {
                addError(errors, "Tache '" + td.title() + "' : " + e.getMessage());
            }
        }

        for (SessionData sd : nullToEmpty(file.sessions())) {
            try {
                if (sd.id() != null && sessions.existsById(sd.id())) {
                    sessionsSkipped++;
                    continue;
                }
                Task task = sd.taskId() == null ? null : importedTasks.get(sd.taskId());
                if (sd.taskId() != null && task == null) {
                    // Tache ignoree (doublon) ou absente : on n'attache pas la session a une tache existante par supposition.
                    sessionsSkipped++;
                    continue;
                }
                PomodoroSession s = PomodoroSession.imported(sd.id(), task, sd.executionNumber(), sd.type(), sd.status(),
                        sd.plannedSeconds(), sd.workedSeconds(), sd.sequenceNumber(), sd.startedAt(), sd.endedAt());
                if (!dryRun) sessions.save(s);
                sessionsCreated++;
            } catch (RuntimeException e) {
                addError(errors, "Session : " + e.getMessage());
            }
        }
        return new ImportReport(dryRun, projectsCreated, projectsReused, tasksCreated, tasksSkipped, sessionsCreated,
                sessionsSkipped, errors);
    }

    // ---- Mapping ------------------------------------------------------------------------------

    private static ProjectData toData(Project p) {
        return new ProjectData(p.getId(), p.getName(), p.getDescription(), p.getColor(), p.getIcon(), p.getDueAt(),
                p.isArchived(), p.getCreatedAt());
    }

    private TaskData toData(Task t) {
        return new TaskData(t.getId(), t.getTitle(), t.getDescription(), t.getNotes(), t.getStatus(), t.isImportant(),
                t.isUrgent(), t.getPosition(), t.getEstimatedMinutes(), t.getProject() == null ? null : t.getProject().getId(),
                t.getTags().stream().map(Tag::getName).sorted().toList(),
                t.getSubtasks().stream().map(s -> new SubtaskData(s.getTitle(), s.isDone(), s.getPosition(), s.getCreatedAt())).toList(),
                t.getCreatedAt(), t.getUpdatedAt(), t.getPlannedStartAt(), t.getPlannedEndAt(), t.getActualStartAt(),
                t.getActualEndAt(), t.getArchivedAt(), t.getExecutionNumber(),
                executions.findByTaskIdOrderByExecutionNumberAsc(t.getId()).stream()
                        .map(e -> new ExecutionData(e.getExecutionNumber(), e.getPlannedStartAt(), e.getPlannedEndAt(),
                                e.getActualStartAt(), e.getActualEndAt(), e.getArchivedAt()))
                        .toList());
    }

    private static <T> List<T> nullToEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }

    private static void addError(List<String> errors, String message) {
        if (errors.size() < MAX_ERRORS) {
            errors.add(message);
        }
    }
}
