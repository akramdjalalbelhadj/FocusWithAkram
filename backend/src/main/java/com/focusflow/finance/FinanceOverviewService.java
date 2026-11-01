package com.focusflow.finance;

import com.focusflow.finance.dto.AccountResponse;
import com.focusflow.finance.dto.CategoryTotal;
import com.focusflow.finance.dto.FinanceOverview;
import com.focusflow.finance.dto.MonthTotals;
import com.focusflow.finance.dto.OperationResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Indicateurs de la vue d'ensemble, calcules a chaque lecture a partir des operations (rien n'est stocke).
 * Le volume d'un mois (quelques centaines d'operations au plus) permet un calcul en memoire, lisible et teste.
 */
@Service
public class FinanceOverviewService {

    private static final int UPCOMING_DAYS = 30;

    private final AccountService accounts;
    private final OperationRepository operations;
    private final ScheduleService schedules;
    private final BudgetService budgets;
    private final LoanService loans;
    private final FinanceDates dates;

    public FinanceOverviewService(AccountService accounts, OperationRepository operations, ScheduleService schedules,
                                  BudgetService budgets, LoanService loans, FinanceDates dates) {
        this.accounts = accounts;
        this.operations = operations;
        this.schedules = schedules;
        this.budgets = budgets;
        this.loans = loans;
        this.dates = dates;
    }

    @Transactional(readOnly = true)
    public FinanceOverview overview(YearMonth month) {
        LocalDate today = dates.today();
        YearMonth m = month == null ? YearMonth.from(today) : month;
        List<AccountResponse> all = accounts.list();
        BigDecimal available = Money.ZERO;
        BigDecimal savings = Money.ZERO;
        for (AccountResponse a : all) {
            if (a.type().isAvailable()) {
                available = available.add(a.balance());
            } else {
                savings = savings.add(a.balance());
            }
        }
        List<Operation> plan = budgets.monthPlan(m);
        MonthTotals totals = totals(plan);
        // A venir : operations prevues et echeances calculees, des retards encore proposes aux 30 prochains jours.
        List<Operation> planned = new ArrayList<>(operations.findPlannedUntil(today.plusDays(UPCOMING_DAYS)));
        planned.addAll(schedules.virtualOccurrences(schedules.overdueWindowStart(), today.plusDays(UPCOMING_DAYS)));
        List<OperationResponse> upcoming = planned.stream()
                .sorted(Comparator.comparing(Operation::getDate))
                .map(o -> FinanceMapper.toResponse(o, today)).toList();
        int overdue = (int) upcoming.stream().filter(OperationResponse::overdue).count();
        BigDecimal[] outstanding = loans.outstanding();
        return new FinanceOverview(m, today, all, available, savings, totals, byCategory(plan), upcoming, overdue,
                budgets.gauge(m, totals), budgets.preferences().getSafetyReserve(), outstanding[0], outstanding[1]);
    }

    /** Bilan d'un ensemble d'operations ; voir {@link MonthTotals} pour la definition de chaque montant. */
    static MonthTotals totals(List<Operation> ops) {
        BigDecimal incomeExpected = Money.ZERO, incomeReceived = Money.ZERO, expenses = Money.ZERO,
                essential = Money.ZERO, variable = Money.ZERO, exceptional = Money.ZERO, refunds = Money.ZERO,
                expensesPlanned = Money.ZERO, essentialPlanned = Money.ZERO, variablePlanned = Money.ZERO,
                goalPurchases = Money.ZERO, saved = Money.ZERO;
        for (Operation o : ops) {
            boolean done = o.getStatus() == OperationStatus.COMPLETED;
            switch (o.getType()) {
                case INCOME -> {
                    if (o.getStatus() != OperationStatus.CANCELLED) {
                        incomeExpected = incomeExpected.add(o.expectedAmount());
                    }
                    if (done) incomeReceived = incomeReceived.add(o.getAmount());
                }
                case EXPENSE -> {
                    if (done) {
                        expenses = expenses.add(o.getAmount());
                        // Un achat d'objectif compte dans les depenses mais pas dans le plafond variable (D4).
                        if (o.getGoal() != null) goalPurchases = goalPurchases.add(o.getAmount());
                        else if (o.isEssential()) essential = essential.add(o.getAmount());
                        else variable = variable.add(o.getAmount());
                        if (o.isExceptional()) exceptional = exceptional.add(o.getAmount());
                    } else if (o.getStatus() == OperationStatus.PLANNED) {
                        expensesPlanned = expensesPlanned.add(o.getAmount());
                        if (o.isEssential()) essentialPlanned = essentialPlanned.add(o.getAmount());
                        else variablePlanned = variablePlanned.add(o.getAmount());
                    }
                }
                case PURCHASE_REFUND -> {
                    if (done) {
                        refunds = refunds.add(o.getAmount());
                        expenses = expenses.subtract(o.getAmount());
                        // Un remboursement reduit la famille de depense d'origine ; sans origine connue, le variable.
                        Operation origin = o.getRefundOf();
                        if (origin != null && origin.getGoal() != null) goalPurchases = goalPurchases.subtract(o.getAmount());
                        else if (origin != null && origin.isEssential()) essential = essential.subtract(o.getAmount());
                        else variable = variable.subtract(o.getAmount());
                    }
                }
                case TRANSFER -> {
                    if (done) {
                        boolean fromSavings = !o.getAccount().getType().isAvailable();
                        boolean toSavings = !o.getTargetAccount().getType().isAvailable();
                        if (toSavings && !fromSavings) saved = saved.add(o.getAmount());
                        if (fromSavings && !toSavings) saved = saved.subtract(o.getAmount());
                    }
                }
                case OPENING_BALANCE, ADJUSTMENT, LOAN_GIVEN, LOAN_COLLECTED, LOAN_TAKEN, LOAN_REPAID -> {
                    // Ni revenu ni depense : soldes initiaux, corrections et mouvements de prets.
                }
            }
        }
        BigDecimal unspent = incomeReceived.subtract(expenses).subtract(saved);
        return new MonthTotals(incomeExpected, incomeReceived, expenses, essential, variable, exceptional, refunds,
                expensesPlanned, essentialPlanned, variablePlanned, goalPurchases, saved, unspent);
    }

    /** Depenses payees nettes par categorie racine, de la plus couteuse a la moins couteuse. */
    static List<CategoryTotal> byCategory(List<Operation> ops) {
        Map<UUID, Category> roots = new LinkedHashMap<>();
        Map<UUID, BigDecimal> amounts = new LinkedHashMap<>();
        Map<UUID, Long> counts = new LinkedHashMap<>();
        for (Operation o : ops) {
            if (o.getStatus() != OperationStatus.COMPLETED || o.getCategory() == null) continue;
            Category root = o.getCategory().root();
            roots.putIfAbsent(root.getId(), root);
            BigDecimal signed = o.getType() == OperationType.PURCHASE_REFUND ? o.getAmount().negate() : o.getAmount();
            amounts.merge(root.getId(), signed, BigDecimal::add);
            if (o.getType() == OperationType.EXPENSE) counts.merge(root.getId(), 1L, Long::sum);
        }
        return roots.values().stream()
                .map(c -> new CategoryTotal(c.getId(), c.getName(), c.getIcon(), c.getColor(), amounts.get(c.getId()),
                        counts.getOrDefault(c.getId(), 0L)))
                .sorted(Comparator.comparing(CategoryTotal::amount).reversed())
                .toList();
    }
}
