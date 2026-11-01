package com.focusflow.task.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.focusflow.common.dto.PatchRequest;

/** Champs modifiables de cette ressource ; presence et null explicite sont conserves. */
public class UpdateSubtaskRequest extends PatchRequest {

    @JsonSetter("title")
    public void setTitle(String value) {
        set("title", value);
    }

    @JsonSetter("done")
    public void setDone(Boolean value) {
        set("done", value);
    }
}
