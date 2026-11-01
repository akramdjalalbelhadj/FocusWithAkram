package com.focusflow.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Creation d'un projet ; les autres champs conservent les valeurs par defaut s'ils sont absents. */
public final class CreateProjectRequest extends ProjectWriteRequest {
    @NotBlank(message = "Le nom du projet est obligatoire.")
    @Size(max = 120, message = "120 caracteres maximum.")
    public String getName() {
        return (String) value("name");
    }
}
