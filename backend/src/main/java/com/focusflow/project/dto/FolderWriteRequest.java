package com.focusflow.project.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.focusflow.common.PatchRequest;

/** Nom et couleur d'un dossier de projets ; presence et null explicite sont conserves. */
public class FolderWriteRequest extends PatchRequest {

    @JsonSetter("name")
    public void setName(String value) {
        set("name", value);
    }

    @JsonSetter("color")
    public void setColor(String value) {
        set("color", value);
    }
}
