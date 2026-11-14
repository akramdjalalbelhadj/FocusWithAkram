package com.focusflow.note;

import java.util.UUID;

/**
 * Criteres de recherche des idees. {@code q} cherche dans le titre, le contenu et les etiquettes.
 * {@code withTasks} : vrai = idees ayant deja donne des taches, faux = idees encore a transformer, null = toutes.
 * {@code archived} : vrai = idees des archives, faux ou null = idees actives.
 */
public record NoteFilter(String q, UUID categoryId, String tag, Boolean favorite, Boolean withTasks, Boolean archived) {

    public NoteFilter(String q, UUID categoryId, String tag, Boolean favorite, Boolean withTasks) {
        this(q, categoryId, tag, favorite, withTasks, false);
    }
}
