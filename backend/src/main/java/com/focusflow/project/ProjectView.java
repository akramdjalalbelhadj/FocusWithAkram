package com.focusflow.project;


import java.util.List;
import java.util.UUID;

/** Projet avec sa progression et ses dossiers (identifiants, par nom), calcules dans la transaction. */
public record ProjectView(Project project, long totalTasks, long doneTasks, List<UUID> folderIds) {
}
