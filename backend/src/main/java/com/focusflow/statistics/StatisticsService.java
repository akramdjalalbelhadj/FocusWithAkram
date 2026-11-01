package com.focusflow.statistics;

import com.focusflow.pomodoro.PomodoroSession;
import com.focusflow.pomodoro.SessionStatus;
import com.focusflow.pomodoro.PomodoroSessionRepository;
import com.focusflow.project.Project;
import com.focusflow.settings.SettingsService;
import com.focusflow.statistics.dto.DayPoint;
import com.focusflow.statistics.dto.DurationComparison;
import com.focusflow.statistics.dto.FocusStats;
import com.focusflow.statistics.dto.PlanningStats;
import com.focusflow.statistics.dto.Productivity;
import com.focusflow.statistics.dto.ProjectShare;
import com.focusflow.statistics.dto.TaskShare;
import com.focusflow.statistics.dto.TaskStats;
import com.focusflow.task.Task;
import com.focusflow.task.TaskExecution;
import com.focusflow.task.Quadrant;
import com.focusflow.task.TaskStatus;
import com.focusflow.task.TaskTiming;
import com.focusflow.task.TaskExecutionRepository;
import com.focusflow.task.TaskRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Statistiques de productivite. Les jours sont ceux du fuseau configure par l'utilisateur ; une session
 * de concentration est attribuee au jour de sa fin, une tache terminee au jour de sa fin reelle.
 */
@Service
public class StatisticsService {

    public static final int MAX_RANGE_DAYS = 400;

    private static final int COMPARISON_LIMIT = 20;
    private static final int TOP_TASKS = 10;

    private final TaskRepository tasks;
    private final TaskExecutionRepository executions;
    private final PomodoroSessionRepository sessions;
    private final SettingsService settings;
    private final Clock clock;

    public StatisticsService(TaskRepository tasks, TaskExecutionRepository executions, PomodoroSessionRepository sessions,
                             SettingsService settings, Clock clock) {
        this.tasks = tasks;
        this.executions = executions;
        this.sessions = sessions;
        this.settings = settings;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Productivity productivity(LocalDate from, LocalDate to) {
        ZoneId zone = settings.zone();
        Instant now = Instant.now(clock);
        LocalDate today = LocalDate.ofInstant(now, zone);
        LocalDate end = to == null ? today : to;
        LocalDate start = from == null ? end.minusDays(29) : from;
        if (start.isAfter(end)) {
            throw new IllegalArgumentException("La date de debut doit preceder la date de fin.");
        }
        if (ChronoUnit.DAYS.between(start, end) > MAX_RANGE_DAYS) {
            throw new IllegalArgumentException("La periode ne peut pas depasser " + MAX_RANGE_DAYS + " jours.");
        }
        Instant lo = start.atStartOfDay(zone).toInstant();
        Instant hi = end.plusDays(1).atStartOfDay(zone).toInstant();

        List<TaskExecution> done = executions.findCompletedBetween(lo, hi);
        List<PomodoroSession> work = sessions.findFinishedWorkBetween(lo, hi);

        return new Productivity(start, end, zone.getId(), taskStats(lo, hi, now, done.size()), focusStats(work, zone, start, end),
                planningStats(done, work, zone, today), daily(done, work, zone, start, end));
    }

    private TaskStats taskStats(Instant lo, Instant hi, Instant now, long completed) {
        List<Task> created = tasks.findCreatedBetween(lo, hi);
        long createdAndDone = created.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
        List<Task> active = tasks.findAllActive();
        Map<Quadrant, Long> byQuadrant = new EnumMap<>(Quadrant.class);
        for (Quadrant q : Quadrant.values()) {
            byQuadrant.put(q, 0L);
        }
        active.forEach(t -> byQuadrant.merge(t.getQuadrant(), 1L, Long::sum));
        Map<TaskStatus, Long> byStatus = new EnumMap<>(TaskStatus.class);
        for (TaskStatus s : TaskStatus.values()) {
            byStatus.put(s, 0L);
        }
        for (Object[] row : tasks.countByStatus()) {
            byStatus.put((TaskStatus) row[0], ((Number) row[1]).longValue());
        }
        double rate = created.isEmpty() ? 0 : (double) createdAndDone / created.size();
        return new TaskStats(created.size(), completed, active.stream().filter(t -> t.isOverdue(now)).count(), createdAndDone,
                rate, byQuadrant, byStatus);
    }

    private FocusStats focusStats(List<PomodoroSession> work, ZoneId zone, LocalDate start, LocalDate end) {
        long total = work.stream().mapToLong(PomodoroSession::getWorkedSeconds).sum();
        List<PomodoroSession> completed = work.stream().filter(s -> s.getStatus() == SessionStatus.COMPLETED).toList();
        long avg = completed.isEmpty() ? 0 : completed.stream().mapToLong(PomodoroSession::getWorkedSeconds).sum() / completed.size();

        Map<LocalDate, Long> perDay = new LinkedHashMap<>();
        work.forEach(s -> perDay.merge(LocalDate.ofInstant(s.getEndedAt(), zone), (long) s.getWorkedSeconds(), Long::sum));
        int goalMinutes = settings.get().getDailyFocusGoalMinutes();
        long reached = goalMinutes <= 0 ? 0 : perDay.values().stream().filter(v -> v >= goalMinutes * 60L).count();

        Map<UUID, ProjectShare> byProject = new LinkedHashMap<>();
        Map<UUID, TaskShare> byTask = new LinkedHashMap<>();
        for (PomodoroSession s : work) {
            Task t = s.getTask();
            if (t == null) {
                continue;
            }
            byTask.merge(t.getId(), new TaskShare(t.getId(), t.getTitle(), s.getWorkedSeconds()),
                    (a, b) -> new TaskShare(a.taskId(), a.title(), a.focusSeconds() + b.focusSeconds()));
            Project p = t.getProject();
            if (p != null) {
                byProject.merge(p.getId(), new ProjectShare(p.getId(), p.getName(), p.getColor(), s.getWorkedSeconds()),
                        (a, b) -> new ProjectShare(a.projectId(), a.name(), a.color(), a.focusSeconds() + b.focusSeconds()));
            }
        }
        return new FocusStats(total, completed.size(), work.size() - completed.size(), avg, goalMinutes, reached,
                byProject.values().stream().sorted(Comparator.comparingLong(ProjectShare::focusSeconds).reversed()).toList(),
                byTask.values().stream().sorted(Comparator.comparingLong(TaskShare::focusSeconds).reversed()).limit(TOP_TASKS).toList());
    }

    private PlanningStats planningStats(List<TaskExecution> done, List<PomodoroSession> work, ZoneId zone, LocalDate today) {
        long early = 0, onTime = 0, late = 0, planned = 0, elapsed = 0, varianceSum = 0, varianceCount = 0;
        List<DurationComparison> comparisons = new ArrayList<>();
        for (TaskExecution e : done) {
            TaskTiming t = TaskTiming.compute(e.getPlannedStartAt(), e.getPlannedEndAt(), e.getActualStartAt(), e.getActualEndAt(), 0);
            if (t.punctuality() != null) {
                switch (t.punctuality()) {
                    case EARLY -> early++;
                    case ON_TIME -> onTime++;
                    case LATE -> late++;
                }
                varianceSum += t.endVarianceSeconds();
                varianceCount++;
            }
            elapsed += t.actualElapsedSeconds() == null ? 0 : t.actualElapsedSeconds();
            if (t.plannedDurationSeconds() != null && t.actualElapsedSeconds() != null) {
                planned += t.plannedDurationSeconds();
                comparisons.add(new DurationComparison(e.getTask().getId(), e.getTask().getTitle(), e.getActualEndAt(),
                        t.plannedDurationSeconds(), t.actualElapsedSeconds()));
            }
        }
        long weekStartDay = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(settings.weekStart())).toEpochDay();
        long thisWeek = done.stream().filter(e -> LocalDate.ofInstant(e.getActualEndAt(), zone).toEpochDay() >= weekStartDay).count();
        List<DurationComparison> latest = comparisons.stream()
                .sorted(Comparator.comparing(DurationComparison::completedAt).reversed()).limit(COMPARISON_LIMIT)
                .sorted(Comparator.comparing(DurationComparison::completedAt)).toList();
        return new PlanningStats(early, onTime, late, varianceCount == 0 ? null : varianceSum / varianceCount, planned, elapsed,
                work.stream().mapToLong(PomodoroSession::getWorkedSeconds).sum(), thisWeek, latest);
    }

    private static List<DayPoint> daily(List<TaskExecution> done, List<PomodoroSession> work, ZoneId zone, LocalDate start,
                                        LocalDate end) {
        Map<LocalDate, long[]> days = new LinkedHashMap<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            days.put(d, new long[3]);
        }
        done.forEach(e -> {
            long[] c = days.get(LocalDate.ofInstant(e.getActualEndAt(), zone));
            if (c != null) c[0]++;
        });
        work.forEach(s -> {
            long[] c = days.get(LocalDate.ofInstant(s.getEndedAt(), zone));
            if (c != null) {
                c[1] += s.getWorkedSeconds();
                if (s.getStatus() == SessionStatus.COMPLETED) c[2]++;
            }
        });
        return days.entrySet().stream().map(e -> new DayPoint(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2])).toList();
    }

    static Duration seconds(long s) {
        return Duration.ofSeconds(s);
    }
}
