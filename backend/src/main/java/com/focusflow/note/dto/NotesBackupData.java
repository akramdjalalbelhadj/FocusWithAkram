package com.focusflow.note.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Section « notes » de la sauvegarde (format v4) : categories d'idees et idees. */
public record NotesBackupData(List<Category> categories, List<Note> notes) {

    public record Category(UUID id, String name, String color, Instant createdAt) {
    }

    public record Note(UUID id, String title, String content, UUID categoryId, List<String> tags, Boolean favorite,
                       Instant createdAt, Instant updatedAt, String archiveReason, Instant archivedAt,
                       Instant purgeAt) {
    }
}
