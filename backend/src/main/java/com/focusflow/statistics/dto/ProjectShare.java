package com.focusflow.statistics.dto;

import java.util.UUID;

public record ProjectShare(UUID projectId, String name, String color, long focusSeconds) {
}
