package com.focusflow.task.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.focusflow.common.PatchRequest;
import com.focusflow.task.Quadrant;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Champs modifiables de cette ressource ; presence et null explicite sont conserves. */
public class UpdateTaskRequest extends PatchRequest {

    @JsonSetter("title")
    public void setTitle(String value) {
        set("title", value);
    }

    @JsonSetter("description")
    public void setDescription(String value) {
        set("description", value);
    }

    @JsonSetter("notes")
    public void setNotes(String value) {
        set("notes", value);
    }

    @JsonSetter("estimatedMinutes")
    public void setEstimatedMinutes(Integer value) {
        set("estimatedMinutes", value);
    }

    @JsonSetter("plannedStartAt")
    public void setPlannedStartAt(Instant value) {
        set("plannedStartAt", value);
    }

    @JsonSetter("plannedEndAt")
    public void setPlannedEndAt(Instant value) {
        set("plannedEndAt", value);
    }

    @JsonSetter("projectId")
    public void setProjectId(UUID value) {
        set("projectId", value);
    }

    @JsonSetter("tags")
    public void setTags(List<String> value) {
        set("tags", value);
    }

    @JsonSetter("quadrant")
    public void setQuadrant(Quadrant value) {
        set("quadrant", value);
    }
}
