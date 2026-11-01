package com.focusflow.finance;

import com.focusflow.finance.ForecastEngine.Event;
import com.focusflow.finance.ForecastEngine.GoalInput;
import com.focusflow.finance.ForecastEngine.GoalResult;
import com.focusflow.finance.ForecastEngine.Month;
import com.focusflow.finance.dto.AccountResponse;
import com.focusflow.finance.dto.ForecastPoint;
import com.focusflow.finance.dto.ForecastResponse;
import com.focusflow.finance.dto.GoalFeasibility;
import com.focusflow.finance.dto.MonthTotals;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Prepare la prevision a partir des donnees reelles et l'execute avec {@link ForecastEngine}. Tout est recalcule
 * a chaque appel : un salaire recu, une facture modifiee, un achat ou un changement d'objectif se repercutent
 * immediatement (specification § 7.6).
 */
@Service
public class ForecastService {

    private static final int MIN_HORIZON_DAYS = 120;
    private static final int MAX_HORIZON_DAYS = 730;

    /** Ordre de priorite des objectifs : quadrant (Q1 a Q4), puis date cible, puis anciennete. */
    public static final Comparator<Goal> PRIORITY = Comparator.comparingInt(Goal::quadrantRank)
            .thenComparing(Goal::getTargetDate)
            .thenComparing(Goal::getCreatedAt);

    private final AccountService accounts;
    private final OperationRepository operations;
    private final ScheduleService schedules;
    private final BudgetService budgets;
    private final MonthlyBudgetRepository monthlyBudgets;
    private final GoalRepository goals;
    private final LoanService loans;
    private final FinanceDates dates;

    public ForecastService(AccountService accounts, OperationRepository operations, ScheduleService schedules,
                           BudgetService budgets, MonthlyBudgetRepository monthlyBudgets, GoalRepository goals,
                           LoanService loans, FinanceDates dates) {
        this.accounts = accounts;
        this.operations = operations;
        this.schedules = schedules;
        this.budgets = budgets;
        this.monthlyBudgets = monthlyBudgets;
        this.goals = goals;
        this.loans = loans;
        this.dates = dates;
    }

    /** Prevision avec les objectifs ouverts enregistres. */
    @Transactional(readOnly = true)
    public ForecastResponse forecast() {
        return forecast(openGoals(null, null));
    }

    /**
     * Faisabilite d'un objectif hypothetique (apercu avant enregistrement) : il remplace l'objectif de meme
     * identifiant s'il existe, et prend sa place dans l'ordre de priorite.
     */
    @Transactional(readOnly = true)
    public GoalFeasibility preview(Goal hypothetical) {
        ForecastResponse r = forecast(openGoals(hypothetical, hypothetical.getId()));
        return r.goals().stream().filter(g -> g.goalId().equals(hypothetical.getId())).findFirst().orElseThrow();
    }

    /** Faisabilite de chaque objectif ouvert, par identifiant. */
    @Transactional(readOnly = true)
    public Map<UUID, GoalFeasibility> feasibilityByGoal() {
        Map<UUID, GoalFeasibility> map = new HashMap<>();
        forecast().goals().forEach(g -> map.put(g.goalId(), g));
        return map;
    }

    private List<Goal> openGoals(Goal extra, UUID replacedId) {
        List<Goal> open = new ArrayList<>(goals.findAllOrdered().stream()
                .filter(g -> g.getStatus().isOpen() && !g.getId().equals(replacedId)).toList());
        if (extra != null) {
            open.add(extra);
        }
        open.sort(PRIORITY);
        return open;
    }

    private ForecastResponse forecast(List<Goal> open) {
        LocalDate today = dates.today();
        FinancePreferences prefs = budgets.preferences();
        List<AccountResponse> all = accounts.list();
        BigDecimal available = Money.ZERO;
        BigDecimal savings = Money.ZERO;
        for (AccountResponse a : all) {
            if (a.type().isAvailable()) available = available.add(a.balance());
            else savings = savings.add(a.balance());
        }
        LocalDate latestTarget = open.stream().map(Goal::getTargetDate).max(LocalDate::compareTo).orElse(today);
        LocalDate horizon = latestTarget.plusDays(ForecastEngine.CHECK_WINDOW_DAYS + 1L);
        if (horizon.isBefore(today.plusDays(MIN_HORIZON_DAYS))) horizon = today.plusDays(MIN_HORIZON_DAYS);
        if (horizon.isAfter(today.plusDays(MAX_HORIZON_DAYS))) horizon = today.plusDays(MAX_HORIZON_DAYS);

        // Prevu : operations prevues (en retard comprises) et echeances calculees.
        List<Operation> planned = new ArrayList<>(operations.findPlannedUntil(horizon));
        List<Operation> virtual = schedules.virtualOccurrences(schedules.overdueWindowStart(), horizon);
        planned.addAll(virtual);
        List<Event> events = new ArrayList<>();
        boolean hasIncome = false;
        for (Operation o : planned) {
            events.add(event(o, today));
            hasIncome |= o.getType() == OperationType.INCOME;
        }

        // Prets : une dette est remboursee a son echeance (sans echeance, sa date est inconnue) ; un remboursement
        // attendu d'un pret accorde n'est pas de l'argent disponible (D5) : il n'est que signale.
        BigDecimal expectedRepayments = Money.ZERO;
        for (LoanService.LoanState s : loans.states()) {
            if (!"OPEN".equals(s.status()) || s.loan().getDueDate() == null) continue;
            if (s.loan().getDirection() == LoanDirection.BORROWED) {
                LocalDate due = s.loan().getDueDate().isBefore(today) ? today : s.loan().getDueDate();
                events.add(new Event(due, s.remaining().negate(), Money.ZERO, false));
            } else if (!s.loan().getDueDate().isAfter(horizon)) {
                expectedRepayments = expectedRepayments.add(s.remaining());
            }
        }

        // Mois : depenses variables restant a anticiper et epargne a mettre de cote.
        List<Operation> window = new ArrayList<>(operations.findBetween(YearMonth.from(today).atDay(1), horizon));
        window.addAll(virtual.stream().filter(o -> !o.getDate().isBefore(YearMonth.from(today).atDay(1))).toList());
        List<Month> months = new ArrayList<>();
        boolean capDefined = false;
        for (YearMonth m = YearMonth.from(today); !m.atDay(1).isAfter(horizon); m = m.plusMonths(1)) {
            YearMonth month = m;
            List<Operation> ops = window.stream().filter(o -> YearMonth.from(o.getDate()).equals(month)).toList();
            MonthTotals t = FinanceOverviewService.totals(ops);
            Optional<MonthlyBudget> b = monthlyBudgets.findByMonth(m.atDay(1));
            BigDecimal cap = b.map(MonthlyBudget::getVariableCap).orElse(null);
            if (cap == null) cap = prefs.getDefaultVariableCap();
            capDefined |= cap != null;
            BigDecimal discretionary = cap == null ? Money.ZERO
                    : cap.subtract(t.variablePaid()).subtract(t.variablePlanned()).max(Money.ZERO);
            BigDecimal target = b.map(MonthlyBudget::getSavingsTarget).orElse(null);
            if (target == null) target = prefs.getDefaultSavingsTarget();
            BigDecimal setAside = target == null ? Money.ZERO
                    : target.subtract(t.savedToSavings()).subtract(plannedToSavings(ops)).max(Money.ZERO);
            months.add(new Month(m, discretionary, setAside, setAsideDate(ops, m, today)));
        }

        List<GoalInput> inputs = open.stream().map(g -> new GoalInput(g.getId(), g.getEstimatedPrice(),
                g.getReservedAmount(), g.getTargetDate(), g.isFundedBySavings())).toList();
        ForecastEngine.Result result = ForecastEngine.run(new ForecastEngine.Input(today, horizon, available, savings,
                prefs.getSafetyReserve(), prefs.getSavingsFloor(), events, months, inputs));

        boolean hasAccount = all.stream().anyMatch(a -> !a.archived());
        Map<UUID, Goal> byId = new HashMap<>();
        open.forEach(g -> byId.put(g.getId(), g));
        boolean incomeExpected = hasIncome;
        boolean capKnown = capDefined;
        List<GoalFeasibility> feasibility = result.goals().stream()
                .map(r -> feasibility(r, byId.get(r.id()), today, hasAccount, incomeExpected, capKnown)).toList();
        return new ForecastResponse(today, horizon, available, savings, prefs.getSafetyReserve(), prefs.getSavingsFloor(),
                capKnown, incomeExpected, result.points().stream().map(ForecastService::point).toList(),
                point(result.lowest()), feasibility, expectedRepayments);
    }

    /** Effet d'une operation prevue sur le disponible et l'epargne ; une operation en retard compte aujourd'hui. */
    static Event event(Operation o, LocalDate today) {
        BigDecimal amount = o.getAmount();
        BigDecimal dA = Money.ZERO;
        BigDecimal dS = Money.ZERO;
        boolean fromAvailable = o.getAccount().getType().isAvailable();
        switch (o.getType()) {
            case INCOME, PURCHASE_REFUND, OPENING_BALANCE, ADJUSTMENT, LOAN_GIVEN, LOAN_COLLECTED, LOAN_TAKEN,
                 LOAN_REPAID -> {
                BigDecimal signed = o.getDirection() == Direction.CREDIT ? amount : amount.negate();
                if (fromAvailable) dA = signed;
                else dS = signed;
            }
            case EXPENSE -> {
                if (fromAvailable) dA = amount.negate();
                else dS = amount.negate();
            }
            case TRANSFER -> {
                if (fromAvailable) dA = dA.subtract(amount);
                else dS = dS.subtract(amount);
                if (o.getTargetAccount().getType().isAvailable()) dA = dA.add(amount);
                else dS = dS.add(amount);
            }
        }
        boolean late = o.getType() == OperationType.INCOME && o.getDate().isBefore(today);
        LocalDate date = o.getDate().isBefore(today) ? today : o.getDate();
        return new Event(date, dA, dS, late);
    }

    /** Virements prevus du disponible vers l'epargne : deja comptes, ils reduisent l'epargne restant a mettre de cote. */
    private static BigDecimal plannedToSavings(List<Operation> ops) {
        return ops.stream()
                .filter(o -> o.getType() == OperationType.TRANSFER && o.getStatus() == OperationStatus.PLANNED
                        && o.getAccount().getType().isAvailable() && !o.getTargetAccount().getType().isAvailable())
                .map(Operation::getAmount).reduce(Money.ZERO, BigDecimal::add);
    }

    /** L'epargne du mois est retiree le jour du salaire (a venir) ; a defaut, aujourd'hui ou le 1er du mois. */
    private static LocalDate setAsideDate(List<Operation> ops, YearMonth m, LocalDate today) {
        LocalDate fallback = m.equals(YearMonth.from(today)) ? today : m.atDay(1);
        return ops.stream()
                .filter(o -> o.getType() == OperationType.INCOME && o.getStatus() == OperationStatus.PLANNED
                        && o.getSchedule() != null && o.getSchedule().getKind() == ScheduleKind.SALARY)
                .map(o -> o.getDate().isBefore(today) ? today : o.getDate())
                .min(LocalDate::compareTo).orElse(fallback);
    }

    private static GoalFeasibility feasibility(GoalResult r, Goal g, LocalDate today, boolean hasAccount,
                                               boolean hasIncome, boolean capDefined) {
        List<String> notes = new ArrayList<>();
        if (!hasAccount) notes.add("NO_ACCOUNT");
        if (!hasIncome) notes.add("NO_INCOME");
        if (!capDefined) notes.add("NO_CAP");
        if (g.getTargetDate().isBefore(today)) notes.add("TARGET_PASSED");
        if (r.dependsOnLateIncome()) notes.add("LATE_INCOME");
        String verdict = hasAccount ? r.verdict().name() : "UNKNOWN";
        BigDecimal effort = null;
        if (r.verdict() == ForecastEngine.Verdict.NOT_FEASIBLE && hasAccount) {
            BigDecimal shortfall = r.need().subtract(r.affordableAtDate()).max(Money.ZERO);
            long months = Math.max(1, (long) Math.ceil(ChronoUnit.DAYS.between(today, r.evaluatedDate()) / 30.0));
            effort = shortfall.divide(BigDecimal.valueOf(months), 2, RoundingMode.UP);
        }
        return new GoalFeasibility(r.id(), verdict, r.evaluatedDate(), r.feasibleDate(), r.retainedDate(), r.need(),
                r.reserved(), r.need().subtract(r.reserved()).max(Money.ZERO), r.availableAtDate(), r.lowestAfterPurchase(),
                r.margin(), r.fromSavings(), r.affordableAtDate(), effort, r.dependsOnLateIncome(), notes);
    }

    private static ForecastPoint point(ForecastEngine.Point p) {
        return new ForecastPoint(p.date(), p.available(), p.savings(), p.afterGoals());
    }
}
