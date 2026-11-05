package com.focusflow.note.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.focusflow.common.PatchRequest;

/** Champs modifiables d'une categorie d'idees ; un champ absent est conserve. */
public class UpdateNoteCategoryRequest extends PatchRequest {

    @JsonSetter("name")
    public void setName(String value) {
        set("name", value);
    }

    @JsonSetter("color")
    public void setColor(String value) {
        set("color", value);
    }
}
