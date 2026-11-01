package com.focusflow.statistics.dto;

import java.util.UUID;

public record TaskShare(UUID taskId, String title, long focusSeconds) {
}
