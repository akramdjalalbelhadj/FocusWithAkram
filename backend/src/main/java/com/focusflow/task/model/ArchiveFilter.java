package com.focusflow.task.model;

import com.focusflow.task.enums.Quadrant;
import java.time.LocalDate;
import java.util.UUID;

public record ArchiveFilter(String q, UUID projectId, Quadrant quadrant, LocalDate from, LocalDate to) {
}
