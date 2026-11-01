package com.focusflow.finance;

import com.focusflow.finance.dto.BudgetGauge;
import com.focusflow.finance.dto.FinanceAlert;
import com.focusflow.finance.dto.ForecastPoint;
import com.focusflow.finance.dto.ForecastResponse;
import com.focusflow.finance.dto.GoalFeasibility;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Alertes du module (specification § 10), derivees a chaque lecture des calculs existants : budget, echeances,
 * prevision, faisabilite des objectifs et prets. Rien n'est stocke : une alerte disparait des que sa cause disparait.
 */
@Service
public class AlertService {

    static final int DUE_SOON_DAYS = 7;
    static final int RESERVE_WINDOW_DAYS = 60;

    private static final Map<String, Integer> SEVERITY_RANK = Map.of("DANGER", 0, "WARNING", 1, "INFO", 2);

    private final BudgetService budgets;
    private final OperationRepository operations;
    private final ScheduleService schedules;
    private final ForecastService forecast;
    private final GoalRepository goals;
    private final LoanService loans;
    private final FinanceDates dates;

    public AlertService(BudgetService budgets, OperationRepository operations, ScheduleService schedules,
                        ForecastService forecast, GoalRepository goals, LoanService loans, FinanceDates dates) {
        this.budgets = budgets;
        this.operations = operations;
        this.schedules = schedules;
        this.forecast = forecast;
        this.goals = goals;
        this.loans = loans;
        this.dates = dates;
    }

    @Transactional(readOnly = true)
    public List<FinanceAlert> alerts() {
        LocalDate today = dates.today();
        List<FinanceAlert> alerts = new ArrayList<>();

        // Plafond variable du mois.
        YearMonth month = YearMonth.from(today);
        BudgetGauge gauge = budgets.gauge(month, FinanceOverviewService.totals(budgets.monthPlan(month)));
        if ("OVER".equals(gauge.state())) {
            alerts.add(new FinanceAlert("BUDGET_OVER", "DANGER", null, null, gauge.remaining().negate(),
                    gauge.percent(), null));
        } else if ("WARNING".equals(gauge.state())) {
            alerts.add(new FinanceAlert("BUDGET_WARNING", "WARNING", null, null, gauge.remaining(), gauge.percent(),
                    null));
        }

        // Echeances : revenus en retard, depenses en retard, depenses des 7 prochains jours.
        LocalDate soon = today.plusDays(DUE_SOON_DAYS);
        List<Operation> planned = new ArrayList<>(operations.findPlannedUntil(soon));
        planned.addAll(schedules.virtualOccurrences(schedules.overdueWindowStart(), soon));
        planned.sort(Comparator.comparing(Operation::getDate));
        List<Operation> overdueExpenses = new ArrayList<>();
        List<Operation> dueSoon = new ArrayList<>();
        for (Operation o : planned) {
            boolean late = o.getDate().isBefore(today);
            if (o.getType() == OperationType.INCOME && late) {
                alerts.add(new FinanceAlert("INCOME_LATE", "WARNING", o.getLabel(), o.getDate(), o.getAmount(), null,
                        o.getId()));
            } else if (o.getType() == OperationType.EXPENSE) {
                (late ? overdueExpenses : dueSoon).add(o);
            }
        }
        if (!overdueExpenses.isEmpty()) {
            alerts.add(new FinanceAlert("EXPENSES_OVERDUE", "DANGER", overdueExpenses.getFirst().getLabel(),
                    overdueExpenses.getFirst().getDate(), sum(overdueExpenses), overdueExpenses.size(), null));
        }
        if (!dueSoon.isEmpty()) {
            alerts.add(new FinanceAlert("DUE_SOON", "INFO", dueSoon.getFirst().getLabel(), dueSoon.getFirst().getDate(),
                    sum(dueSoon), dueSoon.size(), null));
        }

        // Prevision : disponible sous la reserve de securite dans les 60 jours (avant achats prevus).
        ForecastResponse f = forecast.forecast();
        LocalDate limit = today.plusDays(RESERVE_WINDOW_DAYS);
        ForecastPoint firstBreach = null;
        BigDecimal lowest = null;
        for (ForecastPoint p : f.points()) {
            if (p.date().isAfter(limit)) break;
            if (p.available().compareTo(f.safetyReserve()) < 0) {
                if (firstBreach == null) firstBreach = p;
                if (lowest == null || p.available().compareTo(lowest) < 0) lowest = p.available();
            }
        }
        if (firstBreach != null) {
            alerts.add(new FinanceAlert("RESERVE_BREACH", "DANGER", null, firstBreach.date(), lowest, null, null));
        }

        // Objectifs devenus risques ou non realisables.
        Map<UUID, Goal> byId = new HashMap<>();
        goals.findAllOrdered().forEach(g -> byId.put(g.getId(), g));
        for (GoalFeasibility g : f.goals()) {
            Goal goal = byId.get(g.goalId());
            if (goal == null) continue;
            if ("NOT_FEASIBLE".equals(g.verdict())) {
                alerts.add(new FinanceAlert("GOAL_NOT_FEASIBLE", "DANGER", goal.getName(), g.feasibleDate(),
                        g.remainingToFund(), null, goal.getId()));
            } else if ("RISKY".equals(g.verdict())) {
                alerts.add(new FinanceAlert("GOAL_RISKY", "WARNING", goal.getName(), g.evaluatedDate(),
                        g.remainingToFund(), null, goal.getId()));
            }
        }

        // Prets et emprunts en retard.
        for (LoanService.LoanState s : loans.states()) {
            if (!s.overdue()) continue;
            boolean lent = s.loan().getDirection() == LoanDirection.LENT;
            alerts.add(new FinanceAlert(lent ? "LOAN_OVERDUE_LENT" : "LOAN_OVERDUE_BORROWED", lent ? "WARNING" : "DANGER",
                    s.loan().getPerson(), s.loan().getDueDate(), s.remaining(), null, s.loan().getId()));
        }

        alerts.sort(Comparator.comparingInt((FinanceAlert a) -> SEVERITY_RANK.get(a.severity()))
                .thenComparing(FinanceAlert::date, Comparator.nullsFirst(Comparator.naturalOrder())));
        return alerts;
    }

    private static BigDecimal sum(List<Operation> ops) {
        return ops.stream().map(Operation::getAmount).reduce(Money.ZERO, BigDecimal::add);
    }
}
