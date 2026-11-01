package com.focusflow.task;

import com.focusflow.settings.SettingsService;
import com.focusflow.task.dto.TaskResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Liste des priorites derivee de la matrice. L'urgence liee a une echeance (retard) influence uniquement
 * l'ordre a l'interieur d'un quadrant : une tache ne change jamais de quadrant sans action de l'utilisateur.
 */
@Service
public class PriorityService {

    /** Quadrant, puis retard, echeance (sans echeance en dernier), statut en cours d'abord, ordre manuel, creation. */
    static Comparator<Task> order(Instant now) {
        return Comparator
                .comparing((Task t) -> t.getQuadrant().ordinal())
                .thenComparing(t -> !t.isOverdue(now))
                .thenComparing(Task::getPlannedEndAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(t -> t.getStatus() == TaskStatus.IN_PROGRESS ? 0 : 1)
                .thenComparingInt(Task::getPosition)
                .thenComparing(Task::getCreatedAt);
    }

    private final TaskRepository tasks;
    private final DailyGoalRepository goals;
    private final TaskMapper mapper;
    private final SettingsService settings;
    private final Clock clock;

    public PriorityService(TaskRepository tasks, DailyGoalRepository goals, TaskMapper mapper, SettingsService settings,
                           Clock clock) {
        this.tasks = tasks;
        this.goals = goals;
        this.mapper = mapper;
        this.settings = settings;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> priorities(PriorityMode mode, TaskFilter filter) {
        Instant now = Instant.now(clock);
        ZoneId zone = settings.zone();
        if (mode == PriorityMode.DONE) {
            List<Task> done = tasks.findAll(
                    (root, q, cb) -> cb.and(cb.isNotNull(root.get("archivedAt")), cb.equal(root.get("status"), TaskStatus.DONE)),
                    PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "actualEndAt"))).getContent();
            return mapper.toResponses(done);
        }
        List<Task> active = tasks.findAll(TaskSpecifications.active(filter, now));
        LocalDate today = LocalDate.now(clock.withZone(zone));
        List<Task> selected = switch (mode) {
            case PRIORITIES, ALL -> active;
            case OVERDUE -> active.stream().filter(t -> t.isOverdue(now)).toList();
            case WEEK -> {
                LocalDate start = today.with(TemporalAdjusters.previousOrSame(settings.weekStart()));
                Instant from = start.atStartOfDay(zone).toInstant();
                Instant to = start.plusDays(7).atStartOfDay(zone).toInstant();
                yield active.stream()
                        .filter(t -> t.getPlannedEndAt() != null && !t.getPlannedEndAt().isBefore(from) && t.getPlannedEndAt().isBefore(to))
                        .toList();
            }
            case TODAY -> {
                Instant from = today.atStartOfDay(zone).toInstant();
                Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();
                Set<UUID> top3 = new HashSet<>();
                goals.findByGoalDateOrderByPositionAsc(today).forEach(g -> top3.add(g.getTask().getId()));
                yield active.stream().filter(t -> top3.contains(t.getId()) || t.getStatus() == TaskStatus.IN_PROGRESS
                        || overlaps(t, from, to)).toList();
            }
            case DONE -> List.of();
        };
        return mapper.toResponses(selected.stream().sorted(order(now)).toList());
    }

    /** Vrai si l'intervalle prevu de la tache recoupe [from, to[ ; avec une seule borne, seule celle-ci est testee. */
    static boolean overlaps(Task t, Instant from, Instant to) {
        Instant start = t.getPlannedStartAt();
        Instant end = t.getPlannedEndAt();
        if (start == null && end == null) {
            return false;
        }
        Instant s = start != null ? start : end;
        Instant e = end != null ? end : start;
        return s.isBefore(to) && !e.isBefore(from);
    }
}
