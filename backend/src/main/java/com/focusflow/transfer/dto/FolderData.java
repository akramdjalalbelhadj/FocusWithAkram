package com.focusflow.transfer.dto;

import java.time.Instant;
import java.util.UUID;

/** Dossier de projets d'une sauvegarde (v6). */
public record FolderData(UUID id, String name, String color, Instant createdAt) {
}
