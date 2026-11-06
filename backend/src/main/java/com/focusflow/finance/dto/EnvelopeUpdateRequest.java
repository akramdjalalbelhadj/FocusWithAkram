package com.focusflow.finance.dto;

import jakarta.validation.constraints.Size;

/** Libelle (vide : nom de la categorie) et rang d'affichage (absent : inchange) d'une depense variable plafonnee. */
public record EnvelopeUpdateRequest(
        @Size(max = 120, message = "120 caracteres maximum.") String label,
        Integer position) {
}
