package com.focusflow.finance;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/** Filtres composables de l'historique des operations. */
public final class OperationSpecifications {

    private OperationSpecifications() {
    }

    /** @param categoryIds la categorie filtree et ses sous-categories (vide = pas de filtre de categorie) */
    public static Specification<Operation> matching(OperationFilter f, Collection<UUID> categoryIds) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (f.from() != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("date"), f.from()));
            }
            if (f.to() != null) {
                ps.add(cb.lessThanOrEqualTo(root.get("date"), f.to()));
            }
            if (f.accountId() != null) {
                ps.add(cb.or(cb.equal(root.get("account").get("id"), f.accountId()),
                        cb.equal(root.join("targetAccount", JoinType.LEFT).get("id"), f.accountId())));
            }
            if (f.types() != null && !f.types().isEmpty()) {
                ps.add(root.get("type").in(f.types()));
            }
            if (f.statuses() != null && !f.statuses().isEmpty()) {
                ps.add(root.get("status").in(f.statuses()));
            }
            if (!categoryIds.isEmpty()) {
                ps.add(root.get("category").get("id").in(categoryIds));
            }
            if (f.essential() != null) {
                ps.add(cb.equal(root.get("type"), OperationType.EXPENSE));
                ps.add(cb.equal(root.get("essential"), f.essential()));
            }
            if (f.exceptional() != null) {
                ps.add(cb.equal(root.get("exceptional"), f.exceptional()));
            }
            if (f.minAmount() != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("amount"), f.minAmount()));
            }
            if (f.maxAmount() != null) {
                ps.add(cb.lessThanOrEqualTo(root.get("amount"), f.maxAmount()));
            }
            if (f.q() != null && !f.q().isBlank()) {
                String like = "%" + escape(f.q().strip().toLowerCase(Locale.ROOT)) + "%";
                ps.add(cb.or(
                        cb.like(cb.lower(root.get("label")), like, '\\'),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("description"), "")), like, '\\')));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
