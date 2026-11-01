package com.focusflow.finance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Remplacement complet d'une categorie ; `parentId` absent = categorie racine. */
public record CategoryRequest(
        @NotBlank(message = "Le nom de la categorie est obligatoire.") @Size(max = 60, message = "60 caracteres maximum.") String name,
        UUID parentId,
        @Size(max = 40, message = "40 caracteres maximum.") String icon,
        @Size(max = 9, message = "Couleur invalide.") String color,
        Integer position,
        Boolean archived) {
}
