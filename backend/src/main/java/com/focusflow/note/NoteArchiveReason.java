package com.focusflow.note;

/** Raison de la presence d'une idee dans les archives. */
public enum NoteArchiveReason {
    /** Transformee en tache : elle vit desormais comme tache, l'idee reste consultable. */
    CONVERTED,
    /** Archivee a la main. */
    ARCHIVED,
    /** Supprimee alors que des taches en sont issues : effacee definitivement a {@code purgeAt}. */
    DELETED
}
