package com.focusflow.task.model;

import static org.assertj.core.api.Assertions.assertThat;


import com.focusflow.task.model.TaskTiming.Punctuality;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class TaskTimingTest {

    private static Instant at(String time) {
        return Instant.parse("2026-10-29T" + time + ":00Z");
    }

    @Test
    void reproducesTheSpecificationExample() {
        TaskTiming t = TaskTiming.compute(at("09:00"), at("12:00"), at("09:25"), at("13:10"), 7200);

        assertThat(t.plannedDurationSeconds()).isEqualTo(3 * 3600);
        assertThat(t.actualElapsedSeconds()).isEqualTo(3 * 3600 + 45 * 60);
        assertThat(t.startVarianceSeconds()).isEqualTo(25 * 60);
        assertThat(t.endVarianceSeconds()).isEqualTo(70 * 60);
        assertThat(t.durationVarianceSeconds()).isEqualTo(45 * 60);
        assertThat(t.activeSeconds()).isEqualTo(7200);
        assertThat(t.punctuality()).isEqualTo(Punctuality.LATE);
    }

    @Test
    void elapsedAndActiveTimeAreDistinct() {
        TaskTiming t = TaskTiming.compute(null, null, at("08:00"), Instant.parse("2026-10-31T08:00:00Z"), 2 * 3600);
        assertThat(t.actualElapsedSeconds()).isEqualTo(48 * 3600);
        assertThat(t.activeSeconds()).isEqualTo(2 * 3600);
    }

    @Test
    void negativeVarianceMeansEarlier() {
        TaskTiming t = TaskTiming.compute(at("09:00"), at("12:00"), at("08:30"), at("11:00"), 0);
        assertThat(t.startVarianceSeconds()).isEqualTo(-30 * 60);
        assertThat(t.endVarianceSeconds()).isEqualTo(-60 * 60);
        assertThat(t.punctuality()).isEqualTo(Punctuality.EARLY);
    }

    @Test
    void onTimeWithinTolerance() {
        assertThat(TaskTiming.compute(null, at("12:00"), null, at("12:05"), 0).punctuality()).isEqualTo(Punctuality.ON_TIME);
        assertThat(TaskTiming.compute(null, at("12:00"), null, at("11:55"), 0).punctuality()).isEqualTo(Punctuality.ON_TIME);
        assertThat(TaskTiming.compute(null, at("12:00"), null, at("12:06"), 0).punctuality()).isEqualTo(Punctuality.LATE);
    }

    @Test
    void missingDatesAreNeverInvented() {
        TaskTiming t = TaskTiming.compute(null, null, at("09:00"), at("10:00"), 0);
        assertThat(t.plannedDurationSeconds()).isNull();
        assertThat(t.startVarianceSeconds()).isNull();
        assertThat(t.endVarianceSeconds()).isNull();
        assertThat(t.durationVarianceSeconds()).isNull();
        assertThat(t.punctuality()).isNull();
    }
}
