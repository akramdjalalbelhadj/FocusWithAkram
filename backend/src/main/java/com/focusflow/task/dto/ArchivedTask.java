package com.focusflow.task.dto;

import com.focusflow.task.enums.ArchiveSection;
import java.time.LocalDate;

public record ArchivedTask(TaskResponse task, ArchiveSection section, LocalDate day) {
}
