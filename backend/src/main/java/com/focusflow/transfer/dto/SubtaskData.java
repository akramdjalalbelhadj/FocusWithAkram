package com.focusflow.transfer.dto;

import java.time.Instant;

public record SubtaskData(String title, boolean done, int position, Instant createdAt) {
}
