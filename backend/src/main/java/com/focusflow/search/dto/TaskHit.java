package com.focusflow.search.dto;

import com.focusflow.task.enums.Quadrant;
import com.focusflow.task.enums.TaskStatus;
import java.util.UUID;

public record TaskHit(UUID id, String title, TaskStatus status, Quadrant quadrant, boolean archived) {
}
