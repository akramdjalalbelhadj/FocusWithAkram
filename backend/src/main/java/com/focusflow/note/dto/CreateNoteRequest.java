package com.focusflow.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/** Seul le titre est obligatoire : une idee doit pouvoir etre notee en quelques secondes. */
public record CreateNoteRequest(
        @NotBlank(message = "Le titre est obligatoire.") @Size(max = 200, message = "200 caracteres maximum.") String title,
        @Size(max = 100_000, message = "100 000 caracteres maximum.") String content,
        UUID categoryId,
        @Size(max = 10, message = "10 etiquettes maximum.") List<@Size(max = 40, message = "40 caracteres maximum.") String> tags,
        Boolean favorite) {
}
