package com.focusflow.task.archive;

import com.focusflow.task.Quadrant;
import java.time.LocalDate;
import java.util.UUID;

public record ArchiveFilter(String q, UUID projectId, Quadrant quadrant, LocalDate from, LocalDate to) {
}
