package com.focusflow.note.dto;

import com.focusflow.task.dto.TaskResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Idee complete : contenu Markdown et taches qui en sont issues (terminees et archivees comprises). */
public record NoteResponse(UUID id, String title, String content, NoteCategoryRef category, List<String> tags,
                           boolean favorite, Instant createdAt, Instant updatedAt, long version,
                           List<TaskResponse> tasks, Instant archivedAt, String archiveReason, Instant purgeAt) {
}
