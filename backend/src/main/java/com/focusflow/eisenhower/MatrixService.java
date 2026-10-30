package com.focusflow.eisenhower;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.focusflow.task.api.TaskResponse;
import com.focusflow.task.application.TaskFilter;
import com.focusflow.task.application.TaskMapper;
import com.focusflow.task.application.TaskQueries;
import com.focusflow.task.domain.Quadrant;
import com.focusflow.task.domain.Task;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatrixService {

    public record QuadrantView(Quadrant quadrant, String label, int count, int overdueCount, List<TaskResponse> tasks) {
    }

    public record MatrixResponse(List<QuadrantView> quadrants, int total) {
    }

    private static final Map<Quadrant, String> LABELS = Map.of(
            Quadrant.Q1, "FAIRE MAINTENANT",
            Quadrant.Q2, "PLANIFIER",
            Quadrant.Q3, "DELEGUER / LIMITER",
            Quadrant.Q4, "ELIMINER / PLUS TARD");

    private final TaskQueries queries;
    private final TaskMapper mapper;
    private final Clock clock;

    public MatrixService(TaskQueries queries, TaskMapper mapper, Clock clock) {
        this.queries = queries;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public MatrixResponse matrix(TaskFilter filter) {
        Instant now = Instant.now(clock);
        Map<Quadrant, List<Task>> grouped = queries.active(filter).stream()
                .sorted(Comparator.comparingInt(Task::getPosition).thenComparing(Task::getCreatedAt))
                .collect(Collectors.groupingBy(Task::getQuadrant, () -> new EnumMap<>(Quadrant.class), Collectors.toList()));
        int total = 0;
        List<QuadrantView> views = new java.util.ArrayList<>();
        for (Quadrant q : Quadrant.values()) {
            List<Task> list = grouped.getOrDefault(q, List.of());
            total += list.size();
            views.add(new QuadrantView(q, LABELS.get(q), list.size(), (int) list.stream().filter(t -> t.isOverdue(now)).count(),
                    mapper.toResponses(list)));
        }
        return new MatrixResponse(views, total);
    }
}
