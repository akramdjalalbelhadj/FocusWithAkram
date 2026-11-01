package com.focusflow.task.archive;

import com.focusflow.task.dto.TaskResponse;
import java.time.LocalDate;

public record ArchivedTask(TaskResponse task, ArchiveSection section, LocalDate day) {
}
