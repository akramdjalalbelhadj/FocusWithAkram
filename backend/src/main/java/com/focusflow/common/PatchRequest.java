package com.focusflow.common;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Base des requetes partielles typees. Un setter appele avec null signifie
 * « effacer » ; un setter non appele signifie « conserver la valeur ».
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public abstract class PatchRequest {
    private final Map<String, Object> fields = new LinkedHashMap<>();

    protected final void set(String field, Object value) {
        fields.put(field, value);
    }

    protected final Object value(String field) {
        return fields.get(field);
    }

    public final Patch toPatch() {
        return new Patch(new LinkedHashMap<>(fields));
    }
}
