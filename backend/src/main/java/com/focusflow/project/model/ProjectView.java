package com.focusflow.project.model;

import com.focusflow.project.entity.Project;

public record ProjectView(Project project, long totalTasks, long doneTasks) {
}
