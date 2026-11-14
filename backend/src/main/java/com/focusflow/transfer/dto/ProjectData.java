package com.focusflow.transfer.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Projet d'une sauvegarde. {@code folderIds} (v7) : tous ses dossiers ; {@code folderId} : premier dossier,
 * seul lu dans un fichier v6.
 */
public record ProjectData(UUID id, String name, String description, String color, String icon, Instant dueAt,
                          boolean archived, Instant createdAt, UUID folderId,
                          List<UUID> folderIds) {

    /** Dossiers du projet dans le fichier : {@code folderIds} (v7), sinon {@code folderId} (v6). */
    public List<UUID> allFolderIds() {
        if (folderIds != null && !folderIds.isEmpty()) return folderIds;
        return folderId == null ? List.of() : List.of(folderId);
    }
}
