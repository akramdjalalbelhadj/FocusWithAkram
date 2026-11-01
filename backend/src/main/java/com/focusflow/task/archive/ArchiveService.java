package com.focusflow.task.archive;

import com.focusflow.common.PageResponse;
import com.focusflow.common.exception.ApiException;
import com.focusflow.settings.SettingsService;
import com.focusflow.task.dto.TaskResponse;
import com.focusflow.task.Task;
import com.focusflow.task.TaskStatus;
import com.focusflow.task.TaskMapper;
import com.focusflow.task.TaskRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Archives : taches terminees, regroupees par date reelle de fin dans le fuseau de l'utilisateur. */
@Service
public class ArchiveService {

    private final TaskRepository tasks;
    private final TaskMapper mapper;
    private final SettingsService settings;
    private final Clock clock;

    public ArchiveService(TaskRepository tasks, TaskMapper mapper, SettingsService settings, Clock clock) {
        this.tasks = tasks;
        this.mapper = mapper;
        this.settings = settings;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<ArchivedTask> list(ArchiveFilter filter, int page, int size, boolean newestFirst) {
        ZoneId zone = settings.zone();
        Sort sort = Sort.by(newestFirst ? Sort.Direction.DESC : Sort.Direction.ASC, "actualEndAt").and(Sort.by("id"));
        Page<Task> result = tasks.findAll(spec(filter, zone),
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 200), sort));
        List<TaskResponse> responses = mapper.toResponses(result.getContent());
        LocalDate today = LocalDate.now(clock.withZone(zone));
        var weekStart = settings.weekStart();
        List<ArchivedTask> items = new ArrayList<>();
        for (TaskResponse r : responses) {
            LocalDate day = r.actualEndAt().atZone(zone).toLocalDate();
            items.add(new ArchivedTask(r, ArchiveSection.of(day, today, weekStart), day));
        }
        return PageResponse.of(result, items);
    }

    @Transactional(readOnly = true)
    public ArchivedTask get(UUID id) {
        Task t = tasks.findById(id).orElseThrow(() -> ApiException.notFound("Tache archivee", id));
        if (t.getStatus() != TaskStatus.DONE || t.getArchivedAt() == null) {
            throw ApiException.notFound("Tache archivee", id);
        }
        ZoneId zone = settings.zone();
        LocalDate day = t.getActualEndAt().atZone(zone).toLocalDate();
        return new ArchivedTask(mapper.toResponse(t),
                ArchiveSection.of(day, LocalDate.now(clock.withZone(zone)), settings.weekStart()), day);
    }

    /** Nombre de taches terminees par jour (fuseau utilisateur) : alimente la navigation annee / mois / jour. */
    @Transactional(readOnly = true)
    public List<DayCount> facets() {
        ZoneId zone = settings.zone();
        TreeMap<LocalDate, Long> counts = new TreeMap<>();
        for (Instant end : tasks.findAllArchivedEndTimes()) {
            counts.merge(end.atZone(zone).toLocalDate(), 1L, Long::sum);
        }
        return counts.descendingMap().entrySet().stream().map(e -> new DayCount(e.getKey(), e.getValue())).toList();
    }

    private static Specification<Task> spec(ArchiveFilter f, ZoneId zone) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            ps.add(cb.isNotNull(root.get("archivedAt")));
            ps.add(cb.equal(root.get("status"), TaskStatus.DONE));
            if (f.q() != null && !f.q().isBlank()) {
                String like = "%" + f.q().strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                ps.add(cb.like(cb.lower(root.get("title")), like, '\\'));
            }
            if (f.projectId() != null) {
                ps.add(cb.equal(root.get("project").get("id"), f.projectId()));
            }
            if (f.quadrant() != null) {
                ps.add(cb.equal(root.get("important"), f.quadrant().important()));
                ps.add(cb.equal(root.get("urgent"), f.quadrant().urgent()));
            }
            if (f.from() != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("actualEndAt"), f.from().atStartOfDay(zone).toInstant()));
            }
            if (f.to() != null) {
                ps.add(cb.lessThan(root.get("actualEndAt"), f.to().plusDays(1).atStartOfDay(zone).toInstant()));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
    }
}
