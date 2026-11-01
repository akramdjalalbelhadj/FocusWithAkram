package com.focusflow.eisenhower.dto;

import java.util.List;

public record MatrixResponse(List<QuadrantView> quadrants, int total) {
}
