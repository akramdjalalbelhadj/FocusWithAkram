package com.focusflow.note.dto;

/** Compteurs d'import de la section « notes » ; les categories sont rapprochees par nom. */
public record NotesImportSummary(int categoriesCreated, int categoriesReused, int notesCreated, int notesSkipped) {
}
