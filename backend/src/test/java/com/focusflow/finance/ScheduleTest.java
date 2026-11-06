package com.focusflow.finance;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ScheduleTest {

    private static final Instant NOW = Instant.parse("2026-10-30T10:00:00Z");
    private final Account account = new Account("Courant", AccountType.CURRENT, NOW);

    private Schedule income(Frequency frequency, int interval, String start, String amount) {
        return Schedule.create(new Schedule.Draft("Salaire", OperationType.INCOME, ScheduleKind.SALARY, account, null,
                IncomeKind.SALARY, new BigDecimal(amount), false, frequency, interval, LocalDate.parse(start), null, null), NOW);
    }

    private static LocalDate d(String s) {
        return LocalDate.parse(s);
    }

    @Test
    void monthlyDueDatesFollowTheStartDayWithoutDrift() {
        Schedule s = income(Frequency.MONTHLY, 1, "2026-01-31", "2200");
        assertThat(s.dueDatesBetween(d("2026-01-01"), d("2026-05-31")))
                .containsExactly(d("2026-01-31"), d("2026-02-28"), d("2026-03-31"), d("2026-04-30"), d("2026-05-31"));
    }

    @Test
    void weeklyYearlyAndIntervalsAreSupported() {
        assertThat(income(Frequency.WEEKLY, 2, "2026-11-02", "10").dueDatesBetween(d("2026-11-01"), d("2026-11-30")))
                .containsExactly(d("2026-11-02"), d("2026-11-16"), d("2026-11-30"));
        assertThat(income(Frequency.YEARLY, 1, "2024-02-29", "10").dueDatesBetween(d("2025-01-01"), d("2028-12-31")))
                .containsExactly(d("2025-02-28"), d("2026-02-28"), d("2027-02-28"), d("2028-02-29"));
        assertThat(income(Frequency.MONTHLY, 3, "2026-01-15", "10").dueDatesBetween(d("2026-01-01"), d("2026-12-31")))
                .containsExactly(d("2026-01-15"), d("2026-04-15"), d("2026-07-15"), d("2026-10-15"));
    }

    @Test
    void nothingBeforeTheFirstDueDateNorAfterTheEnd() {
        Schedule s = Schedule.create(new Schedule.Draft("Velo", OperationType.INCOME, ScheduleKind.INSTALLMENT, account, null,
                IncomeKind.OTHER, new BigDecimal("50"), false, Frequency.MONTHLY, 1, d("2026-11-05"), d("2027-01-05"), null), NOW);
        assertThat(s.dueDatesBetween(d("2026-01-01"), d("2027-12-31")))
                .containsExactly(d("2026-11-05"), d("2026-12-05"), d("2027-01-05"));
        assertThat(s.nextDueDate(d("2027-01-06"))).isNull();
    }

    @Test
    void pausedSchedulesProduceNothingAndResumeOnTheSameRhythmFromToday() {
        Schedule s = income(Frequency.MONTHLY, 1, "2026-01-28", "2200");
        s.pause(NOW);
        assertThat(s.dueDatesBetween(d("2026-01-01"), d("2026-12-31"))).isEmpty();
        assertThat(s.nextDueDate(d("2026-10-30"))).isNull();

        s.resume(d("2026-10-30"), NOW);
        assertThat(s.getStartDate()).isEqualTo(d("2026-11-28"));
        assertThat(s.dueDatesBetween(d("2026-01-01"), d("2026-12-31"))).containsExactly(d("2026-11-28"), d("2026-12-28"));
    }

    @Test
    void endingStopsFutureDueDatesAndEndingBeforeTheFirstOneLeavesNone() {
        Schedule s = income(Frequency.MONTHLY, 1, "2026-09-28", "2200");
        s.end(d("2026-10-30"), NOW);
        assertThat(s.dueDatesBetween(d("2026-01-01"), d("2027-12-31"))).containsExactly(d("2026-09-28"), d("2026-10-28"));

        Schedule future = income(Frequency.MONTHLY, 1, "2026-12-01", "2200");
        future.end(d("2026-10-30"), NOW);
        assertThat(future.getEndDate()).isEqualTo(d("2026-11-30"));
        assertThat(future.dueDatesBetween(d("2026-01-01"), d("2027-12-31"))).isEmpty();
    }

    @Test
    void monthlyAndAnnualEquivalentsAreComputedExactlyThenRoundedToTheCent() {
        Schedule weekly = income(Frequency.WEEKLY, 1, "2026-11-02", "10");
        assertThat(weekly.monthlyEquivalent(d("2026-11-02"))).isEqualByComparingTo("43.33");
        assertThat(weekly.annualEquivalent(d("2026-11-02"))).isEqualByComparingTo("520.00");
        Schedule quarterly = income(Frequency.MONTHLY, 3, "2026-11-02", "30");
        assertThat(quarterly.monthlyEquivalent(d("2026-11-02"))).isEqualByComparingTo("10.00");
        assertThat(quarterly.annualEquivalent(d("2026-11-02"))).isEqualByComparingTo("120.00");
        Schedule yearly = income(Frequency.YEARLY, 1, "2026-11-02", "99.99");
        assertThat(yearly.monthlyEquivalent(d("2026-11-02"))).isEqualByComparingTo("8.33");
        assertThat(yearly.annualEquivalent(d("2026-11-02"))).isEqualByComparingTo("99.99");
    }

    @Test
    void datedAmountsApplyFromTheirMonthAndSurviveAResume() {
        Schedule s = income(Frequency.MONTHLY, 1, "2026-11-28", "2290");
        s.changeAmount(java.time.YearMonth.parse("2027-01"), new BigDecimal("2400"), NOW);
        assertThat(s.amountOn(d("2026-12-28"))).isEqualByComparingTo("2290");
        assertThat(s.amountOn(d("2027-01-28"))).isEqualByComparingTo("2400");
        assertThat(s.amountOn(d("2027-06-28"))).isEqualByComparingTo("2400");
        assertThat(s.virtualOccurrence(d("2027-01-28"), NOW).getAmount()).isEqualByComparingTo("2400");
        assertThat(s.monthlyEquivalent(d("2027-02-01"))).isEqualByComparingTo("2400");
        assertThat(s.amountTimeline()).hasSize(2);

        // Reprise apres une suspension : le montant valable devient le montant de base.
        s.pause(NOW);
        s.resume(d("2027-02-10"), NOW);
        assertThat(s.getStartDate()).isEqualTo(d("2027-02-28"));
        assertThat(s.getAmount()).isEqualByComparingTo("2400");
        assertThat(s.getAmountVersions()).isEmpty();
        assertThat(s.amountTimeline()).containsOnlyKeys(java.time.YearMonth.parse("2027-02"));
    }

    @Test
    void budgetGaugeThresholdsUseExactAmounts() {
        BigDecimal cap = new BigDecimal("1000");
        assertThat(BudgetService.gauge(cap, new BigDecimal("799.99"), 80).state()).isEqualTo("OK");
        assertThat(BudgetService.gauge(cap, new BigDecimal("800.00"), 80).state()).isEqualTo("WARNING");
        assertThat(BudgetService.gauge(cap, new BigDecimal("1000.00"), 80).state()).isEqualTo("WARNING");
        var over = BudgetService.gauge(cap, new BigDecimal("1000.01"), 80);
        assertThat(over.state()).isEqualTo("OVER");
        assertThat(over.remaining()).isEqualByComparingTo("-0.01");
        assertThat(over.percent()).isEqualTo(100);
        assertThat(BudgetService.gauge(null, BigDecimal.TEN, 80).state()).isEqualTo("NONE");
        assertThat(BudgetService.gauge(BigDecimal.ZERO, BigDecimal.ZERO, 80).state()).isEqualTo("OK");
        assertThat(BudgetService.gauge(BigDecimal.ZERO, BigDecimal.ONE, 80).state()).isEqualTo("OVER");
    }
}
