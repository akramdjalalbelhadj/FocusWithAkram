package com.focusflow.folderdeletion.dto;

import java.util.List;

/**
 * Resultat (ou apercu, {@code dryRun}) d'une suppression de dossiers.
 *
 * @param projectsUnfiled projets qui n'ont plus aucun dossier (mode KEEP_PROJECTS)
 * @param projectsDeleted projets supprimes (modes DELETE_*)
 * @param keptProjects    projets conserves parce qu'ils font aussi partie d'un autre dossier
 * @param tasksDeleted    taches supprimees (mode DELETE_PROJECTS_AND_TASKS)
 * @param tasksKept       taches des projets supprimes qui sont conservees (detachees, ou gardees car elles font
 *                        aussi partie d'un projet conserve)
 */
public record FolderDeletionReport(boolean dryRun, String mode, int foldersDeleted, int projectsUnfiled,
                                   int projectsDeleted, List<KeptProject> keptProjects, int tasksDeleted,
                                   int tasksKept) {

    /** Projet conserve et les dossiers (non supprimes) dont il fait encore partie. */
    public record KeptProject(String name, List<String> otherFolders) {
    }
}
