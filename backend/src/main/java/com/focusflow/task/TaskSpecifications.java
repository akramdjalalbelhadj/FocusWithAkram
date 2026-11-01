package com.focusflow.task;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class TaskSpecifications {

    private TaskSpecifications() {
    }

    /** Taches actives : ni terminees ni archivees, filtrees selon {@code f}. */
    public static Specification<Task> active(TaskFilter f, Instant now) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            ps.add(cb.isNull(root.get("archivedAt")));
            if (f.q() != null && !f.q().isBlank()) {
                String like = "%" + escape(f.q().strip().toLowerCase(Locale.ROOT)) + "%";
                ps.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like, '\\'),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("description"), "")), like, '\\')));
            }
            if (f.status() != null) {
                ps.add(cb.equal(root.get("status"), f.status()));
            }
            if (f.quadrant() != null) {
                ps.add(cb.equal(root.get("important"), f.quadrant().important()));
                ps.add(cb.equal(root.get("urgent"), f.quadrant().urgent()));
            }
            if (f.projectId() != null) {
                ps.add(cb.equal(root.get("project").get("id"), f.projectId()));
            }
            if (f.tag() != null && !f.tag().isBlank()) {
                Join<Task, Tag> tag = root.join("tags");
                ps.add(cb.equal(cb.lower(tag.get("name")), f.tag().strip().toLowerCase(Locale.ROOT)));
            }
            if (f.dueFrom() != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("plannedEndAt"), f.dueFrom()));
            }
            if (f.dueTo() != null) {
                ps.add(cb.lessThan(root.get("plannedEndAt"), f.dueTo()));
            }
            if (Boolean.TRUE.equals(f.overdue())) {
                ps.add(cb.lessThan(root.get("plannedEndAt"), now));
                ps.add(cb.notEqual(root.get("status"), TaskStatus.DONE));
            }
            if (Boolean.TRUE.equals(f.unplanned())) {
                ps.add(cb.isNull(root.get("plannedEndAt")));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
