package com.focusflow.note.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Idee dans une liste : extrait du contenu sans syntaxe Markdown et avancement des taches qui en sont issues
 * (calcule a la lecture ; une idee n'a pas de statut propre). {@code categories} : toutes les categories de l'idee,
 * par nom ; {@code category} : la premiere (ancien contrat, une seule categorie).
 */
public record NoteSummary(UUID id, String title, String excerpt, NoteCategoryRef category,
                          List<NoteCategoryRef> categories, List<String> tags,
                          boolean favorite, Instant createdAt, Instant updatedAt, long taskCount, long tasksDone,
                          Instant archivedAt, String archiveReason, Instant purgeAt) {
}
