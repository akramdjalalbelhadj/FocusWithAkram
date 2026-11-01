package com.focusflow.transfer;

import com.focusflow.common.Patch;
import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.FinanceBackup;
import com.focusflow.finance.dto.FinanceImportSummary;
import com.focusflow.pomodoro.PomodoroSession;
import com.focusflow.pomodoro.PomodoroSessionRepository;
import com.focusflow.project.Project;
import com.focusflow.project.ProjectRepository;
import com.focusflow.settings.SettingsService;
import com.focusflow.settings.UserSettings;
import com.focusflow.task.DailyGoal;
import com.focusflow.task.DailyGoalRepository;
import com.focusflow.task.Subtask;
import com.focusflow.task.Tag;
import com.focusflow.task.Task;
import com.focusflow.task.TaskExecution;
import com.focusflow.task.TagRepository;
import com.focusflow.task.TaskExecutionRepository;
import com.focusflow.task.TaskRepository;
import com.focusflow.transfer.dto.BackupFile;
import com.focusflow.transfer.dto.DailyGoalData;
import com.focusflow.transfer.dto.ExecutionData;
import com.focusflow.transfer.dto.ImportReport;
import com.focusflow.transfer.dto.ProjectData;
import com.focusflow.transfer.dto.SessionData;
import com.focusflow.transfer.dto.SettingsData;
import com.focusflow.transfer.dto.SubtaskData;
import com.focusflow.transfer.dto.TaskData;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

/** Export (CSV / JSON / sauvegarde complete) et import JSON valide avec gestion des doublons. */
@Service
public class TransferService {

    private static final int MAX_ERRORS = 50;

    private final TaskRepository tasks;
    private final ProjectRepository projects;
    private final TagRepository tags;
    private final TaskExecutionRepository executions;
    private final PomodoroSessionRepository sessions;
    private final DailyGoalRepository dailyGoals;
    private final SettingsService settings;
    private final FinanceBackup finance;
    private final Clock clock;

    public TransferService(TaskRepository tasks, ProjectRepository projects, TagRepository tags,
                           TaskExecutionRepository executions, PomodoroSessionRepository sessions,
                           DailyGoalRepository dailyGoals, SettingsService settings, FinanceBackup finance, Clock clock) {
        this.tasks = tasks;
        this.projects = projects;
        this.tags = tags;
        this.executions = executions;
        this.sessions = sessions;
        this.dailyGoals = dailyGoals;
        this.settings = settings;
        this.finance = finance;
        this.clock = clock;
    }

    // ---- Export -------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public BackupFile backup() {
        List<Task> all = tasks.findAll(Sort.by("createdAt"));
        Map<UUID, List<ExecutionData>> executionsByTask = executionsByTask();
        return new BackupFile(BackupFile.CURRENT_VERSION, Instant.now(clock),
                projects.findAllByOrderByNameAsc().stream().map(TransferService::toData).toList(),
                all.stream().map(t -> toData(t, executionsByTask)).toList(),
                sessions.findAll(Sort.by("startedAt")).stream().filter(s -> !s.getStatus().isActive())
                        .map(s -> new SessionData(s.getId(), s.getTask() == null ? null : s.getTask().getId(),
                                s.getExecutionNumber(), s.getType(), s.getStatus(), s.getPlannedSeconds(), s.getWorkedSeconds(),
                                s.getSequenceNumber(), s.getStartedAt(), s.getEndedAt()))
                        .toList(),
                toData(settings.get()),
                dailyGoals.findAll(Sort.by("goalDate", "position")).stream()
                        .map(g -> new DailyGoalData(g.getGoalDate(), g.getTask().getId(), g.getPosition(), g.getCreatedAt()))
                        .toList(),
                finance.export());
    }

    @Transactional(readOnly = true)
    public List<TaskData> exportTasks(ExportScope scope) {
        Map<UUID, List<ExecutionData>> executionsByTask = executionsByTask();
        return tasks.findAll(Sort.by("createdAt")).stream()
                .filter(t -> inScope(t, scope))
                .map(t -> toData(t, executionsByTask)).toList();
    }

    @Transactional(readOnly = true)
    public String exportCsv(ExportScope scope) {
        StringWriter out = new StringWriter();
        PrintWriter w = new PrintWriter(out);
        w.print("﻿");
        w.print("id,titre,description,statut,quadrant,projet,etiquettes,sous_taches_terminees,sous_taches_total,"
                + "creation,debut_prevu,fin_prevue,debut_reel,fin_reelle,archivage,estimation_minutes,temps_actif_secondes\r\n");
        List<Task> list = tasks.findAll(Sort.by("createdAt")).stream().filter(t -> inScope(t, scope)).toList();
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
     * Importe une sauvegarde (version 1 a 3).
     * <ul>
     *   <li>Les taches deja presentes (meme identifiant, ou meme titre et date de creation) sont ignorees ;
     *       les projets sont rapproches par nom.</li>
     *   <li>Chaque element est valide avant d'etre ecrit : un element invalide est signale dans le rapport
     *       sans empecher les autres.</li>
     *   <li>Une session est rattachee a une tache existante uniquement si leurs identifiants concordent,
     *       jamais sur la seule ressemblance du titre (pas de double comptage du temps).</li>
     *   <li>Les preferences presentes dans la sauvegarde remplacent les preferences courantes.</li>
     * </ul>
     * En mode {@code dryRun}, l'import est execute puis la transaction est annulee : le rapport est celui
     * d'un import reel, sans aucune ecriture.
     */
    @Transactional
    public ImportReport importBackup(BackupFile file, boolean dryRun) {
        if (file == null || file.version() < BackupFile.OLDEST_SUPPORTED_VERSION) {
            throw ApiException.rule("IMPORT_UNSUPPORTED_VERSION", "Version de sauvegarde non prise en charge.");
        }
        if (file.version() > BackupFile.CURRENT_VERSION) {
            throw ApiException.rule("IMPORT_UNSUPPORTED_VERSION",
                    "Cette sauvegarde provient d'une version plus recente de l'application (format " + file.version()
                            + ") : mettez l'application a jour avant de l'importer.");
        }
        ImportRun run = new ImportRun();
        importProjects(file, run);
        importTasks(file, run);
        importSessions(file, run);
        importDailyGoals(file, run);
        importSettings(file, run);
        FinanceImportSummary financeSummary = file.finance() == null ? null : finance.importData(file.finance(), run::error);
        if (dryRun) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        }
        return new ImportReport(dryRun, run.projectsCreated, run.projectsReused, run.tasksCreated, run.tasksSkipped,
                run.sessionsCreated, run.sessionsSkipped, run.errors, run.settingsRestored, run.goalsCreated,
                run.goalsSkipped, financeSummary);
    }

    /** Etat d'un import : correspondances d'identifiants et compteurs du rapport. */
    private static final class ImportRun {
        final List<String> errors = new ArrayList<>();
        final Map<UUID, Project> projectsByFileId = new HashMap<>();
        /** Taches de la sauvegarde resolues vers une tache de la base : creee, ou deja presente avec le meme identifiant. */
        final Map<UUID, Task> tasksByFileId = new HashMap<>();
        int projectsCreated, projectsReused, tasksCreated, tasksSkipped, sessionsCreated, sessionsSkipped;
        int goalsCreated, goalsSkipped;
        boolean settingsRestored;

        void error(String message) {
            if (errors.size() < MAX_ERRORS) {
                errors.add(message);
            }
        }
    }

    private void importProjects(BackupFile file, ImportRun run) {
        Map<String, Project> byName = new HashMap<>();
        projects.findAll().forEach(p -> byName.putIfAbsent(p.getName().toLowerCase(), p));
        for (ProjectData pd : nullToEmpty(file.projects())) {
            try {
                String name = pd.name() == null ? "" : pd.name().strip();
                if (name.isEmpty() || name.length() > 120) {
                    throw new IllegalArgumentException("nom absent ou de plus de 120 caracteres.");
                }
                if (pd.icon() != null && pd.icon().length() > 40) {
                    throw new IllegalArgumentException("icone de plus de 40 caracteres.");
                }
                Project existing = byName.get(name.toLowerCase());
                if (existing != null) {
                    if (pd.id() != null) run.projectsByFileId.put(pd.id(), existing);
                    run.projectsReused++;
                    continue;
                }
                Project p = new Project(name, pd.createdAt() != null ? pd.createdAt() : Instant.now(clock));
                p.setDescription(pd.description());
                if (pd.color() != null && pd.color().matches("^#[0-9a-fA-F]{6}$")) p.setColor(pd.color());
                p.setIcon(pd.icon());
                p.setDueAt(pd.dueAt());
                p.setArchived(pd.archived());
                p = projects.save(p);
                byName.put(name.toLowerCase(), p);
                if (pd.id() != null) run.projectsByFileId.put(pd.id(), p);
                run.projectsCreated++;
            } catch (RuntimeException e) {
                run.error("Projet '" + pd.name() + "' : " + e.getMessage());
            }
        }
    }

    private void importTasks(BackupFile file, ImportRun run) {
        Set<UUID> seen = new HashSet<>();
        for (TaskData td : nullToEmpty(file.tasks())) {
            try {
                if (td.id() != null && !seen.add(td.id())) {
                    throw new IllegalArgumentException("identifiant en double dans le fichier : " + td.id());
                }
                if (td.id() != null && tasks.existsById(td.id())) {
                    run.tasksByFileId.put(td.id(), tasks.getReferenceById(td.id()));
                    run.tasksSkipped++;
                    continue;
                }
                if (td.title() != null && td.createdAt() != null
                        && tasks.existsByTitleIgnoreCaseAndCreatedAt(td.title().strip(), td.createdAt())) {
                    run.tasksSkipped++;
                    continue;
                }
                Task t = Task.fromSnapshot(new Task.Snapshot(td.id(), td.title(), td.description(), td.notes(), td.status(),
                        td.important(), td.urgent(), td.position(), td.estimatedMinutes(), td.createdAt(), td.updatedAt(),
                        td.plannedStartAt(), td.plannedEndAt(), td.actualStartAt(), td.actualEndAt(), td.archivedAt(),
                        td.executionNumber()));
                if (td.projectId() != null) t.setProject(run.projectsByFileId.get(td.projectId()));
                for (SubtaskData sd : nullToEmpty(td.subtasks())) {
                    t.addImportedSubtask(sd.title(), sd.done(), sd.position(), sd.createdAt() != null ? sd.createdAt() : t.getCreatedAt());
                }
                // Les cycles sont valides avant toute ecriture : un cycle invalide ne laisse pas une tache incomplete.
                List<ExecutionData> cycles = nullToEmpty(td.executions());
                Set<Integer> numbers = new HashSet<>();
                for (ExecutionData ed : cycles) {
                    if (!numbers.add(ed.executionNumber())) {
                        throw new IllegalArgumentException("cycle " + ed.executionNumber() + " present deux fois.");
                    }
                    TaskExecution.imported(t, ed.executionNumber(), ed.plannedStartAt(), ed.plannedEndAt(),
                            ed.actualStartAt(), ed.actualEndAt(), ed.archivedAt());
                }
                // Toutes les validations sont faites : les ecritures ne peuvent plus echouer sur une contrainte.
                for (String name : nullToEmpty(td.tags())) {
                    if (name != null && !name.isBlank() && name.strip().length() <= 40) {
                        String n = name.strip();
                        t.getTags().add(tags.findByNameIgnoreCase(n).orElseGet(() -> tags.save(new Tag(n))));
                    }
                }
                Task saved = tasks.save(t);
                for (ExecutionData ed : cycles) {
                    executions.save(TaskExecution.imported(saved, ed.executionNumber(), ed.plannedStartAt(),
                            ed.plannedEndAt(), ed.actualStartAt(), ed.actualEndAt(), ed.archivedAt()));
                }
                if (td.id() != null) run.tasksByFileId.put(td.id(), saved);
                run.tasksCreated++;
            } catch (RuntimeException e) {
                run.error("Tache '" + td.title() + "' : " + e.getMessage());
            }
        }
    }

    private void importSessions(BackupFile file, ImportRun run) {
        Set<UUID> seen = new HashSet<>();
        for (SessionData sd : nullToEmpty(file.sessions())) {
            try {
                if (sd.id() != null && (!seen.add(sd.id()) || sessions.existsById(sd.id()))) {
                    run.sessionsSkipped++;
                    continue;
                }
                Task task = sd.taskId() == null ? null : run.tasksByFileId.get(sd.taskId());
                if (sd.taskId() != null && task == null) {
                    // Tache absente, invalide ou seulement ressemblante : on ne rattache pas par supposition.
                    run.sessionsSkipped++;
                    continue;
                }
                PomodoroSession s = PomodoroSession.imported(sd.id(), task, sd.executionNumber(), sd.type(), sd.status(),
                        sd.plannedSeconds(), sd.workedSeconds(), sd.sequenceNumber(), sd.startedAt(), sd.endedAt());
                sessions.save(s);
                run.sessionsCreated++;
            } catch (RuntimeException e) {
                run.error("Session : " + e.getMessage());
            }
        }
    }

    private void importDailyGoals(BackupFile file, ImportRun run) {
        Set<String> taken = new HashSet<>();
        for (DailyGoalData gd : nullToEmpty(file.dailyGoals())) {
            try {
                if (gd.goalDate() == null || gd.taskId() == null || gd.position() < 0 || gd.position() > 2) {
                    throw new IllegalArgumentException("date, tache ou position (0 a 2) invalide.");
                }
                Task task = run.tasksByFileId.get(gd.taskId());
                LocalDate date = gd.goalDate();
                if (task == null || !taken.add(date + "/t/" + gd.taskId()) || !taken.add(date + "/p/" + gd.position())
                        || dailyGoals.existsByGoalDateAndTaskId(date, task.getId())
                        || dailyGoals.existsByGoalDateAndPosition(date, gd.position())) {
                    run.goalsSkipped++;
                    continue;
                }
                dailyGoals.save(new DailyGoal(date, task, gd.position(),
                        gd.createdAt() != null ? gd.createdAt() : Instant.now(clock)));
                run.goalsCreated++;
            } catch (RuntimeException e) {
                run.error("Top 3 du " + gd.goalDate() + " : " + e.getMessage());
            }
        }
    }

    private void importSettings(BackupFile file, ImportRun run) {
        SettingsData sd = file.settings();
        if (sd == null) {
            return;
        }
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("timeZone", sd.timeZone());
        values.put("weekStartsOn", sd.weekStartsOn());
        values.put("theme", sd.theme());
        values.put("workMinutes", sd.workMinutes());
        values.put("shortBreakMinutes", sd.shortBreakMinutes());
        values.put("longBreakMinutes", sd.longBreakMinutes());
        values.put("sessionsBeforeLong", sd.sessionsBeforeLong());
        values.put("autoStartBreaks", sd.autoStartBreaks());
        values.put("autoStartWork", sd.autoStartWork());
        values.put("notificationsEnabled", sd.notificationsEnabled());
        values.put("soundEnabled", sd.soundEnabled());
        values.put("soundName", sd.soundName());
        values.put("dailyFocusGoalMinutes", sd.dailyFocusGoalMinutes());
        values.put("subtasksCompleteParent", sd.subtasksCompleteParent());
        values.put("shortcutsEnabled", sd.shortcutsEnabled());
        values.put("compactMode", sd.compactMode());
        values.values().removeIf(Objects::isNull);
        try {
            // Validation complete sur une copie avant application : aucune preference n'est restauree a moitie.
            settings.validate(new Patch(values));
            settings.update(new Patch(values));
            run.settingsRestored = true;
        } catch (RuntimeException e) {
            run.error("Preferences non restaurees : " + e.getMessage());
        }
    }

    // ---- Mapping ------------------------------------------------------------------------------

    private Map<UUID, List<ExecutionData>> executionsByTask() {
        return executions.findAll(Sort.by("executionNumber")).stream().collect(Collectors.groupingBy(
                e -> e.getTask().getId(),
                Collectors.mapping(e -> new ExecutionData(e.getExecutionNumber(), e.getPlannedStartAt(), e.getPlannedEndAt(),
                        e.getActualStartAt(), e.getActualEndAt(), e.getArchivedAt()), Collectors.toList())));
    }

    private static boolean inScope(Task t, ExportScope scope) {
        return switch (scope) {
            case ACTIVE -> t.getArchivedAt() == null;
            case ARCHIVED -> t.getArchivedAt() != null;
            case ALL -> true;
        };
    }

    private static ProjectData toData(Project p) {
        return new ProjectData(p.getId(), p.getName(), p.getDescription(), p.getColor(), p.getIcon(), p.getDueAt(),
                p.isArchived(), p.getCreatedAt());
    }

    private static SettingsData toData(UserSettings s) {
        return new SettingsData(s.getTimeZone(), s.getWeekStartsOn(), s.getTheme(), s.getWorkMinutes(),
                s.getShortBreakMinutes(), s.getLongBreakMinutes(), s.getSessionsBeforeLong(), s.isAutoStartBreaks(),
                s.isAutoStartWork(), s.isNotificationsEnabled(), s.isSoundEnabled(), s.getSoundName(),
                s.getDailyFocusGoalMinutes(), s.isSubtasksCompleteParent(), s.isShortcutsEnabled(), s.isCompactMode());
    }

    private static TaskData toData(Task t, Map<UUID, List<ExecutionData>> executionsByTask) {
        return new TaskData(t.getId(), t.getTitle(), t.getDescription(), t.getNotes(), t.getStatus(), t.isImportant(),
                t.isUrgent(), t.getPosition(), t.getEstimatedMinutes(), t.getProject() == null ? null : t.getProject().getId(),
                t.getTags().stream().map(Tag::getName).sorted().toList(),
                t.getSubtasks().stream().map(s -> new SubtaskData(s.getTitle(), s.isDone(), s.getPosition(), s.getCreatedAt())).toList(),
                t.getCreatedAt(), t.getUpdatedAt(), t.getPlannedStartAt(), t.getPlannedEndAt(), t.getActualStartAt(),
                t.getActualEndAt(), t.getArchivedAt(), t.getExecutionNumber(),
                executionsByTask.getOrDefault(t.getId(), List.of()));
    }

    private static <T> List<T> nullToEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }
}
