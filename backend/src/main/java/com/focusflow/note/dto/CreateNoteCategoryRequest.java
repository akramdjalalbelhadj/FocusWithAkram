package com.focusflow.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateNoteCategoryRequest(
        @NotBlank(message = "Le nom est obligatoire.") @Size(max = 60, message = "60 caracteres maximum.") String name,
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Couleur au format #rrggbb.") String color) {
}
