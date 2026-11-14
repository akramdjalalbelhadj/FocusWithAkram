package com.focusflow.transfer.dto;

import java.util.List;

/**
 * Conflit d'import (lot 25) : un dossier du fichier (ou ses projets sans dossier, {@code folder} absent) dont le
 * dossier, ou au moins un projet, existe deja dans l'application (meme nom, sans tenir compte de la casse).
 *
 * @param folder           nom du dossier dans le fichier ; absent pour les projets sans dossier
 * @param folderExists     un dossier de ce nom existe deja
 * @param projectCount     nombre de projets de ce dossier dans le fichier
 * @param existingProjects projets du fichier qui existent deja, avec leurs dossiers actuels
 */
public record ImportConflict(String folder, boolean folderExists, int projectCount,
                             List<ExistingProject> existingProjects) {

    /** Projet deja present : son nom, ses dossiers actuels (vide = sans dossier) et s'il est inactif. */
    public record ExistingProject(String name, List<String> currentFolders, boolean inactive) {
    }
}
