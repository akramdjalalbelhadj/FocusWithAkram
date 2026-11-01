package com.focusflow.task.enums;

import static com.focusflow.task.enums.ArchiveSection.PREVIOUS_MONTHS;
import static com.focusflow.task.enums.ArchiveSection.PREVIOUS_YEARS;
import static com.focusflow.task.enums.ArchiveSection.THIS_MONTH;
import static com.focusflow.task.enums.ArchiveSection.THIS_WEEK;
import static com.focusflow.task.enums.ArchiveSection.TODAY;
import static com.focusflow.task.enums.ArchiveSection.YESTERDAY;
import static org.assertj.core.api.Assertions.assertThat;


import java.time.DayOfWeek;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ArchiveSectionTest {

    // Vendredi 30 octobre 2026.
    private static final LocalDate TODAY_DATE = LocalDate.of(2026, 10, 30);

    private static ArchiveSection of(String day) {
        return ArchiveSection.of(LocalDate.parse(day), TODAY_DATE, DayOfWeek.MONDAY);
    }

    @Test
    void classifiesEachDayInExactlyOneSection() {
        assertThat(of("2026-10-30")).isEqualTo(TODAY);
        assertThat(of("2026-10-29")).isEqualTo(YESTERDAY);
        assertThat(of("2026-10-28")).isEqualTo(THIS_WEEK);
        assertThat(of("2026-10-26")).isEqualTo(THIS_WEEK);
        assertThat(of("2026-10-25")).isEqualTo(THIS_MONTH); // dimanche precedent : semaine d'avant
        assertThat(of("2026-10-01")).isEqualTo(THIS_MONTH);
        assertThat(of("2026-09-30")).isEqualTo(PREVIOUS_MONTHS);
        assertThat(of("2026-01-01")).isEqualTo(PREVIOUS_MONTHS);
        assertThat(of("2025-12-31")).isEqualTo(PREVIOUS_YEARS);
    }

    @Test
    void yesterdayWinsOverThisWeekAndFutureDaysCountAsToday() {
        LocalDate monday = LocalDate.of(2026, 10, 26);
        assertThat(ArchiveSection.of(LocalDate.of(2026, 10, 25), monday, DayOfWeek.MONDAY)).isEqualTo(YESTERDAY);
        assertThat(of("2026-11-02")).isEqualTo(TODAY);
    }

    @Test
    void respectsConfiguredFirstDayOfWeek() {
        // Semaine commencant le dimanche : le 25 octobre appartient a la semaine courante.
        assertThat(ArchiveSection.of(LocalDate.of(2026, 10, 25), TODAY_DATE, DayOfWeek.SUNDAY)).isEqualTo(THIS_WEEK);
    }
}
