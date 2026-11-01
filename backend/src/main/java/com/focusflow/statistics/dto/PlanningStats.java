package com.focusflow.statistics.dto;

import java.util.List;

public record PlanningStats(long early, long onTime, long late, Long averageEndVarianceSeconds, long totalPlannedSeconds,
                            long totalElapsedSeconds, long totalActiveSeconds, long completedThisWeek,
                            List<DurationComparison> comparisons) {
}
