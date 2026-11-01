package com.focusflow.common.util;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Lecture d'un corps PATCH : distingue un champ absent (inchange) d'un champ present a null (efface). */
public final class Patch {

    private final Map<String, Object> body;

    public Patch(Map<String, Object> body) {
        this.body = body == null ? Map.of() : body;
    }

    public boolean has(String field) {
        return body.containsKey(field);
    }

    public String string(String field) {
        Object v = body.get(field);
        return v == null ? null : v.toString();
    }

    public Boolean bool(String field) {
        Object v = body.get(field);
        if (v == null) {
            return null;
        }
        if (v instanceof Boolean b) {
            return b;
        }
        throw new IllegalArgumentException("Le champ '" + field + "' doit etre un booleen.");
    }

    public Integer integer(String field) {
        Object v = body.get(field);
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.intValue();
        }
        throw new IllegalArgumentException("Le champ '" + field + "' doit etre un entier.");
    }

    public Instant instant(String field) {
        Object v = body.get(field);
        if (v == null) {
            return null;
        }
        try {
            return Instant.parse(v.toString());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Le champ '" + field + "' doit etre un instant ISO-8601 UTC.");
        }
    }

    public UUID uuid(String field) {
        Object v = body.get(field);
        if (v == null) {
            return null;
        }
        try {
            return UUID.fromString(v.toString());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Le champ '" + field + "' doit etre un UUID.");
        }
    }

    public List<String> strings(String field) {
        Object v = body.get(field);
        if (v == null) {
            return List.of();
        }
        if (v instanceof List<?> list) {
            return list.stream().map(Object::toString).toList();
        }
        throw new IllegalArgumentException("Le champ '" + field + "' doit etre une liste.");
    }
}
