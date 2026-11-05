package com.focusflow.note.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.focusflow.common.PatchRequest;
import java.util.List;
import java.util.UUID;

/** Champs modifiables d'une idee ; presence et null explicite sont conserves (enregistrement automatique partiel). */
public class UpdateNoteRequest extends PatchRequest {

    @JsonSetter("title")
    public void setTitle(String value) {
        set("title", value);
    }

    @JsonSetter("content")
    public void setContent(String value) {
        set("content", value);
    }

    @JsonSetter("categoryId")
    public void setCategoryId(UUID value) {
        set("categoryId", value);
    }

    @JsonSetter("tags")
    public void setTags(List<String> value) {
        set("tags", value);
    }

    @JsonSetter("favorite")
    public void setFavorite(Boolean value) {
        set("favorite", value);
    }
}
