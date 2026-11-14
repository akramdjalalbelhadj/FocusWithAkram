package com.focusflow.folderdeletion.dto;

import com.focusflow.folderdeletion.FolderDeletionMode;
import java.util.List;
import java.util.UUID;

/** Dossiers a supprimer et sort de leurs projets. */
public record FolderDeletionRequest(List<UUID> folderIds, FolderDeletionMode mode) {
}
