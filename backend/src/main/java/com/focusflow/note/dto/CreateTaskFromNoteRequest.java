package com.focusflow.note.dto;

import com.focusflow.task.dto.CreateTaskRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * Tache a creer depuis une idee : memes champs et memes regles qu'une creation de tache ordinaire.
 * {@code allowDuplicate} confirme la creation d'une tache dont le titre existe deja parmi les taches de l'idee.
 */
public record CreateTaskFromNoteRequest(
        @NotNull(message = "La tache est obligatoire.") @Valid CreateTaskRequest task,
        Boolean allowDuplicate) {
}
