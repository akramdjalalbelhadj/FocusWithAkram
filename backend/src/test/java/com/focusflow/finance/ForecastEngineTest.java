package com.focusflow.finance;

import static org.assertj.core.api.Assertions.assertThat;

import com.focusflow.finance.ForecastEngine.Event;
import com.focusflow.finance.ForecastEngine.GoalInput;
import com.focusflow.finance.ForecastEngine.GoalResult;
import com.focusflow.finance.ForecastEngine.Input;
import com.focusflow.finance.ForecastEngine.Month;
import com.focusflow.finance.ForecastEngine.Result;
import com.focusflow.finance.ForecastEngine.Verdict;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Faisabilite des achats sur des scenarios controles. Aujourd'hui = 01/11/2026 ; montants en euros.
 * Chaque attendu est calcule a la main dans le commentaire du test.
 */
class ForecastEngineTest {

    private static final LocalDate TODAY = LocalDate.parse("2026-11-01");
    private static final LocalDate HORIZON = TODAY.plusDays(200);

    private final List<Event> events = new ArrayList<>();
    private final List<Month> months = new ArrayList<>();
    private final List<GoalInput> goals = new ArrayList<>();
    private BigDecimal available = Money.ZERO;
    private BigDecimal savings = Money.ZERO;
    private BigDecimal reserve = Money.ZERO;
    private BigDecimal floor = Money.ZERO;

    private static BigDecimal eur(String v) {
        return new BigDecimal(v).setScale(2);
    }

    private static LocalDate day(int offset) {
        return TODAY.plusDays(offset);
    }

    private void event(int offset, String availableDelta) {
        events.add(new Event(day(offset), eur(availableDelta), Money.ZERO, false));
    }

    private UUID goal(String price, int targetOffset) {
        return goal(price, "0", targetOffset, false);
    }

    private UUID goal(String price, String reserved, int targetOffset, boolean fundedBySavings) {
        UUID id = UUID.randomUUID();
        goals.add(new GoalInput(id, eur(price), eur(reserved), day(targetOffset), fundedBySavings));
        return id;
    }

    private Result run() {
        return ForecastEngine.run(new Input(TODAY, HORIZON, available, savings, reserve, floor, events, months, goals));
    }

    private static GoalResult result(Result r, UUID id) {
        return r.goals().stream().filter(g -> g.id().equals(id)).findFirst().orElseThrow();
    }

    @Test
    void anAffordablePurchaseWithAComfortableMarginIsFeasible() {
        available = eur("1000");
        UUID watch = goal("400", 10);
        GoalResult g = result(run(), watch);
        // 1000 - 400 = 600 restants, marge >= 10 % du prix.
        assertThat(g.verdict()).isEqualTo(Verdict.FEASIBLE);
        assertThat(g.margin()).isEqualByComparingTo("600");
        assertThat(g.feasibleDate()).isEqualTo(TODAY);
        assertThat(g.retainedDate()).isEqualTo(day(10));
    }

    @Test
    void anUnaffordablePurchaseGetsTheFirstRealisticDateAfterTheSalary() {
        available = eur("100");
        event(27, "2200"); // salaire le 28/11
        UUID watch = goal("400", 5);
        GoalResult g = result(run(), watch);
        // Au 06/11 : 100 < 400. Apres le salaire : 2300 - 400 = 1900.
        assertThat(g.verdict()).isEqualTo(Verdict.NOT_FEASIBLE);
        assertThat(g.margin()).isEqualByComparingTo("-300");
        assertThat(g.feasibleDate()).isEqualTo(day(27));
        assertThat(g.retainedDate()).isEqualTo(day(27));
        assertThat(g.affordableAtDate()).isEqualByComparingTo("100");
    }

    @Test
    void theCheckLooksAheadSoAPurchaseRightBeforeTheRentIsNotFeasible() {
        available = eur("1000");
        event(15, "-800"); // loyer le 16/11
        event(40, "2000"); // salaire le 11/12
        UUID watch = goal("400", 10);
        GoalResult g = result(run(), watch);
        // Le 11/11, 1000 >= 400 ; mais apres le loyer : 1000 - 800 - 400 = -200.
        assertThat(g.availableAtDate()).isEqualByComparingTo("1000");
        assertThat(g.lowestAfterPurchase()).isEqualByComparingTo("-200");
        assertThat(g.verdict()).isEqualTo(Verdict.NOT_FEASIBLE);
        // Premiere date sure : le jour du salaire (2200 - 400 = 1800 ensuite).
        assertThat(g.feasibleDate()).isEqualTo(day(40));
    }

    @Test
    void theSafetyReserveIsNeverSpent() {
        available = eur("1000");
        reserve = eur("700");
        UUID watch = goal("400", 0);
        GoalResult g = result(run(), watch);
        // 1000 - 400 = 600 < 700 de reserve.
        assertThat(g.verdict()).isEqualTo(Verdict.NOT_FEASIBLE);
        assertThat(g.margin()).isEqualByComparingTo("-100");
        assertThat(g.affordableAtDate()).isEqualByComparingTo("300");
    }

    @Test
    void aThinMarginIsRisky() {
        available = eur("1030");
        UUID watch = goal("1000", 3);
        // Marge 30 < 10 % de 1000.
        assertThat(result(run(), watch).verdict()).isEqualTo(Verdict.RISKY);
    }

    @Test
    void theSameMoneyIsNeverPromisedTwiceAndPriorityDecides() {
        available = eur("1000");
        UUID first = goal("600", 5);
        UUID second = goal("600", 6);
        Result r = run();
        // Le premier (prioritaire) consomme 600 ; il ne reste que 400 pour le second.
        assertThat(result(r, first).verdict()).isEqualTo(Verdict.FEASIBLE);
        assertThat(result(r, second).verdict()).isEqualTo(Verdict.NOT_FEASIBLE);
        assertThat(result(r, second).availableAtDate()).isEqualByComparingTo("400");
        // Courbe apres achats : 1000 - 600 a partir du 06/11.
        assertThat(r.lowest().afterGoals()).isEqualByComparingTo("400");
    }

    @Test
    void reservedMoneyBelongsToItsGoalOnly() {
        available = eur("1000");
        UUID urgent = goal("600", "0", 5, false);
        UUID reserved = goal("500", "500", 20, false);
        Result r = run();
        // Le prioritaire ne voit que 1000 - 500 reserves = 500 < 600.
        assertThat(result(r, urgent).verdict()).isEqualTo(Verdict.NOT_FEASIBLE);
        assertThat(result(r, urgent).availableAtDate()).isEqualByComparingTo("500");
        // L'objectif reserve dispose de toute sa reservation : 1000 - 500 = 500 de marge.
        assertThat(result(r, reserved).verdict()).isEqualTo(Verdict.FEASIBLE);
        assertThat(result(r, reserved).margin()).isEqualByComparingTo("500");
    }

    @Test
    void savingsFundUnlockedGoalsAboveTheFloorOnly() {
        available = eur("300");
        savings = eur("2000");
        floor = eur("1500");
        UUID fromSavings = goal("600", "0", 5, true);
        UUID fromAvailable = goal("600", "0", 5, false);
        Result r = run();
        // 500 mobilisables au-dessus du plancher, 100 pris sur le disponible : 300 - 100 = 200 de marge.
        GoalResult g = result(r, fromSavings);
        assertThat(g.verdict()).isEqualTo(Verdict.FEASIBLE);
        assertThat(g.fromSavings()).isEqualByComparingTo("500");
        assertThat(g.margin()).isEqualByComparingTo("200");
        // L'epargne n'est pas mobilisee pour un objectif qui ne l'autorise pas.
        assertThat(result(r, fromAvailable).verdict()).isEqualTo(Verdict.NOT_FEASIBLE);
        assertThat(r.points().get(10).savings()).isEqualByComparingTo("2000");
    }

    @Test
    void aPurchaseThatOnlyWorksThanksToALateSalaryIsRisky() {
        available = eur("100");
        events.add(new Event(TODAY, eur("2200"), Money.ZERO, true)); // salaire du 28/10 non recu
        UUID watch = goal("400", 3);
        GoalResult g = result(run(), watch);
        assertThat(g.verdict()).isEqualTo(Verdict.RISKY);
        assertThat(g.dependsOnLateIncome()).isTrue();
    }

    @Test
    void discretionarySpendingIsSpreadOverTheRemainingDaysToTheCent() {
        available = eur("1000");
        months.add(new Month(YearMonth.of(2026, 11), eur("300"), Money.ZERO, null));
        Result r = run();
        // 300 sur 30 jours = 10 par jour : 990 le 01/11, 700 le 30/11.
        assertThat(r.points().get(0).available()).isEqualByComparingTo("990");
        assertThat(r.points().get(29).available()).isEqualByComparingTo("700");
        assertThat(r.points().get(30).available()).isEqualByComparingTo("700");

        months.clear();
        months.add(new Month(YearMonth.of(2026, 11), eur("100"), Money.ZERO, null));
        Result exact = ForecastEngine.run(new Input(LocalDate.parse("2026-11-28"), LocalDate.parse("2026-12-31"),
                eur("1000"), Money.ZERO, Money.ZERO, Money.ZERO, List.of(), months, List.of()));
        // 100 sur 3 jours : 33,33 + 33,33 + 33,34, sans perte d'un centime.
        assertThat(exact.points().get(0).available()).isEqualByComparingTo("966.67");
        assertThat(exact.points().get(2).available()).isEqualByComparingTo("900");
    }

    @Test
    void theMonthlySavingsTargetIsSetAsideFirstAndProtected() {
        available = eur("1000");
        months.add(new Month(YearMonth.of(2026, 11), Money.ZERO, eur("500"), day(1)));
        UUID watch = goal("600", 5);
        Result r = run();
        // 500 passent en epargne le 02/11 : il ne reste que 500 de disponible.
        assertThat(r.points().get(1).available()).isEqualByComparingTo("500");
        assertThat(r.points().get(1).savings()).isEqualByComparingTo("500");
        assertThat(result(r, watch).verdict()).isEqualTo(Verdict.NOT_FEASIBLE);
    }

    @Test
    void aPastTargetIsEvaluatedFromToday() {
        available = eur("1000");
        UUID late = goal("100", -10);
        GoalResult g = result(run(), late);
        assertThat(g.evaluatedDate()).isEqualTo(TODAY);
        assertThat(g.verdict()).isEqualTo(Verdict.FEASIBLE);
    }
}
