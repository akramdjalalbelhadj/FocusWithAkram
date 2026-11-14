package com.focusflow.project;

import com.focusflow.project.dto.ProjectResponse;

/** Mapping explicite entre le modele persistant et le contrat HTTP. */
public final class ProjectMapper {
    private ProjectMapper() {}

    public static ProjectResponse toResponse(ProjectView v) {
        Project p = v.project();
        return new ProjectResponse(p.getId(), p.getName(), p.getDescription(), p.getColor(), p.getIcon(),
                p.getDueAt(), p.isArchived(), p.getCreatedAt(), v.totalTasks(), v.doneTasks(),
                p.getFolder() == null ? null : p.getFolder().getId());
    }
}
