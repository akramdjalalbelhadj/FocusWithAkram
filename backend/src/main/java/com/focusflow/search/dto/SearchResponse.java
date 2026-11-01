package com.focusflow.search.dto;

import java.util.List;

public record SearchResponse(List<TaskHit> tasks, List<ProjectHit> projects) {
}
