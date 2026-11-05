package com.focusflow.note;

import java.util.UUID;

/**
 * Criteres de recherche des idees. {@code withTasks} : vrai = idees ayant deja donne des taches,
 * faux = idees encore a transformer, null = toutes.
 */
public record NoteFilter(String q, UUID categoryId, String tag, Boolean favorite, Boolean withTasks) {
}
