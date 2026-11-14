package com.focusflow.folderdeletion;

/**
 * Sort des projets des dossiers supprimes (lot 27). Dans tous les cas, un projet qui fait aussi partie d'un
 * dossier conserve n'est jamais supprime : il quitte seulement les dossiers supprimes.
 * <ul>
 *   <li>{@code KEEP_PROJECTS} : les projets restent ; ceux qui n'ont plus de dossier passent « sans dossier » ;</li>
 *   <li>{@code DELETE_PROJECTS} : les projets qui n'etaient que dans ces dossiers sont supprimes, leurs taches
 *       sont conservees (detachees de ces projets) ;</li>
 *   <li>{@code DELETE_PROJECTS_AND_TASKS} : ces projets sont supprimes avec leurs taches ; une tache qui fait
 *       aussi partie d'un projet conserve est gardee, rattachee a ce seul projet.</li>
 * </ul>
 */
public enum FolderDeletionMode { KEEP_PROJECTS, DELETE_PROJECTS, DELETE_PROJECTS_AND_TASKS }
