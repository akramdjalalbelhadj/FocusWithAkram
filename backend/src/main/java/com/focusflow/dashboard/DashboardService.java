package com.focusflow.dashboard;

import com.focusflow.common.exception.ApiException;
import com.focusflow.dashboard.dto.DayActivity;
import com.focusflow.dashboard.dto.Kpis;
import com.focusflow.dashboard.dto.QuadrantCount;
import com.focusflow.dashboard.dto.Summary;
import com.focusflow.dashboard.dto.TopGoals;
import com.focusflow.pomodoro.PomodoroSession;
import com.focusflow.pomodoro.SessionStatus;
import com.focusflow.pomodoro.PomodoroSessionRepository;
import com.focusflow.settings.SettingsService;
import com.focusflow.task.dto.TaskResponse;
import com.focusflow.task.DailyGoal;
import com.focusflow.task.Task;
import com.focusflow.task.TaskExecution;
import com.focusflow.task.Quadrant;
import com.focusflow.task.TaskStatus;
import com.focusflow.task.TaskMapper;
import com.focusflow.task.DailyGoalRepository;
import com.focusflow.task.TaskExecutionRepository;
import com.focusflow.task.TaskRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Agregats du tableau de bord quotidien. Tout provient de la base ; rien n'est simule. */
@Service
public class DashboardService {

    private static final int TOP_LIMIT = 3;

    private final TaskRepository tasks;
    private final TaskExecutionRepository executions;
    private final PomodoroSessionRepository sessions;
    private final DailyGoalRepository goals;
    private final SettingsService settings;
    private final TaskMapper mapper;
    private final Clock clock;

    public DashboardService(TaskRepository tasks, TaskExecutionRepository executions, PomodoroSessionRepository sessions,
                            DailyGoalRepository goals, SettingsService settings, TaskMapper mapper, Clock clock) {
        this.tasks = tasks;
        this.executions = executions;
        this.sessions = sessions;
        this.goals = goals;
        this.settings = settings;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Summary summary() {
        ZoneId zone = settings.zone();
        Instant now = Instant.now(clock);
        LocalDate today = LocalDate.ofInstant(now, zone);
        LocalDate weekStart = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(settings.weekStart()));
        LocalDate seriesStart = today.minusDays(6);
        Instant from = (weekStart.isBefore(seriesStart) ? weekStart : seriesStart).atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<TaskExecution> done = executions.findCompletedBetween(from, to);
        List<PomodoroSession> work = sessions.findFinishedWorkBetween(from, to);

        List<Task> active = tasks.findAllActive();
        int overdue = (int) active.stream().filter(t -> t.isOverdue(now)).count();

        int completedToday = (int) done.stream().filter(e -> day(e.getActualEndAt(), zone).equals(today)).count();
        int completedWeek = (int) done.stream().filter(e -> !day(e.getActualEndAt(), zone).isBefore(weekStart)).count();
        long focusToday = work.stream().filter(s -> day(s.getEndedAt(), zone).equals(today)).mapToLong(PomodoroSession::getWorkedSeconds).sum();
        int pomodorosToday = (int) work.stream()
                .filter(s -> s.getStatus() == SessionStatus.COMPLETED && day(s.getEndedAt(), zone).equals(today)).count();
        int goalMinutes = settings.get().getDailyFocusGoalMinutes();
        double progress = goalMinutes <= 0 ? 0 : Math.min(1.0, focusToday / (goalMinutes * 60.0));

        Map<Quadrant, int[]> counts = new EnumMap<>(Quadrant.class);
        for (Quadrant q : Quadrant.values()) {
            counts.put(q, new int[2]);
        }
        for (Task t : active) {
            int[] c = counts.get(t.getQuadrant());
            c[0]++;
            if (t.isOverdue(now)) {
                c[1]++;
            }
        }
        List<QuadrantCount> matrix = counts.entrySet().stream()
                .map(e -> new QuadrantCount(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();

        List<DayActivity> week = new ArrayList<>();
        for (LocalDate d = seriesStart; !d.isAfter(today); d = d.plusDays(1)) {
            LocalDate date = d;
            week.add(new DayActivity(date,
                    (int) done.stream().filter(e -> day(e.getActualEndAt(), zone).equals(date)).count(),
                    work.stream().filter(s -> day(s.getEndedAt(), zone).equals(date)).mapToLong(PomodoroSession::getWorkedSeconds).sum()));
        }

        Task inProgress = active.stream().filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS)
                .min(java.util.Comparator.comparing(Task::getUpdatedAt).reversed()).orElse(null);

        Kpis kpis = new Kpis(active.size(), completedToday, completedWeek, focusToday, pomodorosToday, overdue, goalMinutes, progress);
        return new Summary(today, zone.getId(), kpis, top3(today), matrix, week, inProgress == null ? null : mapper.toResponse(inProgress));
    }

    @Transactional(readOnly = true)
    public TopGoals top3() {
        return top3(LocalDate.now(clock.withZone(settings.zone())));
    }

    /** Remplace le Top 3 du jour. Seules des taches actives peuvent etre choisies. */
    @Transactional
    public TopGoals setTop3(List<UUID> taskIds) {
        if (taskIds.size() > TOP_LIMIT || taskIds.stream().distinct().count() != taskIds.size()) {
            throw new IllegalArgumentException("Le Top 3 contient au plus 3 taches distinctes.");
        }
        Instant now = Instant.now(clock);
        LocalDate today = LocalDate.now(clock.withZone(settings.zone()));
        Map<UUID, Task> found = tasks.findAllWithProjectByIdIn(taskIds).stream().collect(Collectors.toMap(Task::getId, t -> t));
        goals.deleteByGoalDate(today);
        goals.flush();
        for (int i = 0; i < taskIds.size(); i++) {
            Task t = found.get(taskIds.get(i));
            if (t == null) {
                throw ApiException.notFound("Tache", taskIds.get(i));
            }
            if (!t.isActive()) {
                throw ApiException.rule("TASK_NOT_ACTIVE", "Seule une tache a faire peut entrer dans le Top 3.");
            }
            goals.save(new DailyGoal(today, t, i, now));
        }
        return top3(today);
    }

    private TopGoals top3(LocalDate today) {
        List<DailyGoal> list = goals.findByGoalDateOrderByPositionAsc(today);
        List<TaskResponse> responses = mapper.toResponses(list.stream().map(DailyGoal::getTask).toList());
        int done = (int) responses.stream().filter(r -> r.status() == TaskStatus.DONE).count();
        return new TopGoals(responses, done, responses.size());
    }

    private static LocalDate day(Instant instant, ZoneId zone) {
        return LocalDate.ofInstant(instant, zone);
    }
}
