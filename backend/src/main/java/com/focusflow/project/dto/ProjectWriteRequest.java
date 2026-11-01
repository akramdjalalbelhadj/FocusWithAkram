package com.focusflow.project.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.focusflow.common.dto.PatchRequest;
import java.time.Instant;

/** Champs modifiables de cette ressource ; presence et null explicite sont conserves. */
public class ProjectWriteRequest extends PatchRequest {

    @JsonSetter("name")
    public void setName(String value) {
        set("name", value);
    }

    @JsonSetter("description")
    public void setDescription(String value) {
        set("description", value);
    }

    @JsonSetter("color")
    public void setColor(String value) {
        set("color", value);
    }

    @JsonSetter("icon")
    public void setIcon(String value) {
        set("icon", value);
    }

    @JsonSetter("dueAt")
    public void setDueAt(Instant value) {
        set("dueAt", value);
    }

    @JsonSetter("archived")
    public void setArchived(Boolean value) {
        set("archived", value);
    }
}
