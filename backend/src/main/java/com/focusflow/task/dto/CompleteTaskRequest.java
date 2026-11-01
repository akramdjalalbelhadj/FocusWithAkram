package com.focusflow.task.dto;

import java.time.Instant;

public record CompleteTaskRequest(Instant actualStartAt, Instant actualEndAt) {}
