package com.focusflow.note;

import com.focusflow.task.Task;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/** Recherche des idees : texte (titre et contenu), categorie, etiquette, favori, avec ou sans taches. */
final class NoteSpecifications {

    private NoteSpecifications() {
    }

    static Specification<Note> matching(NoteFilter f) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (f.q() != null && !f.q().isBlank()) {
                String like = "%" + escape(f.q().strip().toLowerCase(Locale.ROOT)) + "%";
                Subquery<UUID> tagged = query.subquery(UUID.class);
                Root<Note> tn = tagged.from(Note.class);
                Join<Note, String> tagName = tn.join("tags");
                tagged.select(tn.get("id")).where(cb.equal(tn.get("id"), root.get("id")),
                        cb.like(cb.lower(tagName), like, '\\'));
                ps.add(cb.or(cb.like(cb.lower(root.get("title")), like, '\\'),
                        cb.like(cb.lower(root.get("content")), like, '\\'), cb.exists(tagged)));
            }
            ps.add(Boolean.TRUE.equals(f.archived()) ? cb.isNotNull(root.get("archivedAt"))
                    : cb.isNull(root.get("archivedAt")));
            if (f.categoryId() != null) {
                ps.add(cb.equal(root.get("category").get("id"), f.categoryId()));
            }
            if (f.tag() != null && !f.tag().isBlank()) {
                Join<Note, String> tag = root.join("tags");
                ps.add(cb.equal(cb.lower(tag), f.tag().strip().toLowerCase(Locale.ROOT)));
            }
            if (f.favorite() != null) {
                ps.add(cb.equal(root.get("favorite"), f.favorite()));
            }
            if (f.withTasks() != null) {
                Subquery<UUID> tasks = query.subquery(UUID.class);
                Root<Task> t = tasks.from(Task.class);
                tasks.select(t.get("id")).where(cb.equal(t.get("sourceNoteId"), root.get("id")));
                ps.add(f.withTasks() ? cb.exists(tasks) : cb.not(cb.exists(tasks)));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
