package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.dto.FinanceStatistics;
import com.focusflow.finance.dto.FinanceStatistics.CategoryStat;
import com.focusflow.finance.dto.FinanceStatistics.MonthStat;
import com.focusflow.finance.dto.FinanceStatistics.PurchaseStat;
import com.focusflow.finance.dto.FinanceStatistics.SubcategoryStat;
import com.focusflow.finance.dto.FinanceStatistics.Totals;
import com.focusflow.finance.dto.MonthTotals;
import com.focusflow.finance.dto.OperationResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Statistiques du module sur des mois complets, calculees a la lecture sur les operations realisees (memes regles
 * que le bilan du mois, voir {@link FinanceOverviewService#totals}). Quelques milliers d'operations par an : le calcul
 * en memoire reste immediat.
 */
@Service
public class FinanceStatisticsService {

    static final int MAX_MONTHS = 24;
    private static final int TOP_EXPENSES = 5;

    private final OperationRepository operations;
    private final LoanService loans;
    private final FinanceDates dates;

    public FinanceStatisticsService(OperationRepository operations, LoanService loans, FinanceDates dates) {
        this.operations = operations;
        this.loans = loans;
        this.dates = dates;
    }

    /** Periode par defaut : les 12 derniers mois, mois en cours compris. */
    @Transactional(readOnly = true)
    public FinanceStatistics statistics(YearMonth from, YearMonth to) {
        LocalDate today = dates.today();
        YearMonth end = to == null ? YearMonth.from(today) : to;
        YearMonth start = from == null ? end.minusMonths(11) : from;
        long count = ChronoUnit.MONTHS.between(start, end) + 1;
        if (count < 1 || count > MAX_MONTHS) {
            throw ApiException.rule("INVALID_PERIOD", "La periode doit compter de 1 a " + MAX_MONTHS + " mois.");
        }
        List<Operation> done = operations.findBetween(start.atDay(1), end.atEndOfMonth()).stream()
                .filter(o -> o.getStatus() == OperationStatus.COMPLETED).toList();

        List<MonthStat> months = new ArrayList<>();
        for (YearMonth m = start; !m.isAfter(end); m = m.plusMonths(1)) {
            YearMonth month = m;
            MonthTotals t = FinanceOverviewService.totals(
                    done.stream().filter(o -> YearMonth.from(o.getDate()).equals(month)).toList());
            months.add(new MonthStat(m, t.incomeReceived(), t.expensesPaid(), t.essentialPaid(), t.variablePaid(),
                    t.goalPurchasesPaid(), t.savedToSavings(), t.unspent()));
        }

        MonthTotals all = FinanceOverviewService.totals(done);
        BigDecimal n = BigDecimal.valueOf(count);
        Integer savingsRate = all.incomeReceived().signum() <= 0 ? null
                : all.savedToSavings().multiply(BigDecimal.valueOf(100))
                        .divide(all.incomeReceived(), 0, RoundingMode.HALF_UP).intValue();
        Totals totals = new Totals(all.incomeReceived(), all.expensesPaid(), all.essentialPaid(), all.variablePaid(),
                all.goalPurchasesPaid(), all.exceptionalPaid(), all.refunds(), all.savedToSavings(), all.unspent(),
                all.incomeReceived().divide(n, 2, RoundingMode.HALF_UP),
                all.expensesPaid().divide(n, 2, RoundingMode.HALF_UP), savingsRate);

        List<OperationResponse> top = done.stream()
                .filter(o -> o.getType() == OperationType.EXPENSE)
                .sorted(Comparator.comparing(Operation::getAmount).reversed().thenComparing(Operation::getDate))
                .limit(TOP_EXPENSES)
                .map(o -> FinanceMapper.toResponse(o, today)).toList();

        List<PurchaseStat> purchases = operations.findGoalPurchases().stream()
                .filter(o -> !o.getDate().isBefore(start.atDay(1)) && !o.getDate().isAfter(end.atEndOfMonth()))
                .sorted(Comparator.comparing(Operation::getDate))
                .map(o -> new PurchaseStat(o.getGoal().getId(), o.getGoal().getName(), o.getDate(),
                        o.getGoal().getEstimatedPrice(), o.getAmount(),
                        o.getAmount().subtract(o.getGoal().getEstimatedPrice())))
                .toList();

        BigDecimal writtenOffLent = Money.ZERO;
        BigDecimal writtenOffBorrowed = Money.ZERO;
        for (LoanService.LoanState s : loans.states()) {
            Loan l = s.loan();
            if (l.isCancelled() || l.getWrittenOffDate() == null) continue;
            YearMonth m = YearMonth.from(l.getWrittenOffDate());
            if (m.isBefore(start) || m.isAfter(end)) continue;
            if (l.getDirection() == LoanDirection.LENT) writtenOffLent = writtenOffLent.add(l.getWrittenOffAmount());
            else writtenOffBorrowed = writtenOffBorrowed.add(l.getWrittenOffAmount());
        }
        return new FinanceStatistics(start, end, months, totals, categories(done), top, purchases, writtenOffLent,
                writtenOffBorrowed);
    }

    /** Depenses nettes par categorie racine puis sous-categorie ; les depenses d'une racine directe sont « general ». */
    static List<CategoryStat> categories(List<Operation> done) {
        Map<UUID, Category> roots = new LinkedHashMap<>();
        Map<UUID, BigDecimal> rootAmounts = new LinkedHashMap<>();
        Map<UUID, Long> counts = new LinkedHashMap<>();
        Map<UUID, Map<UUID, Category>> subs = new LinkedHashMap<>();
        Map<UUID, BigDecimal> subAmounts = new LinkedHashMap<>();
        for (Operation o : done) {
            if (o.getCategory() == null
                    || o.getType() != OperationType.EXPENSE && o.getType() != OperationType.PURCHASE_REFUND) continue;
            Category c = o.getCategory();
            Category root = c.root();
            BigDecimal signed = o.getType() == OperationType.PURCHASE_REFUND ? o.getAmount().negate() : o.getAmount();
            roots.putIfAbsent(root.getId(), root);
            rootAmounts.merge(root.getId(), signed, BigDecimal::add);
            if (o.getType() == OperationType.EXPENSE) counts.merge(root.getId(), 1L, Long::sum);
            if (c.getParent() != null) {
                subs.computeIfAbsent(root.getId(), k -> new LinkedHashMap<>()).putIfAbsent(c.getId(), c);
                subAmounts.merge(c.getId(), signed, BigDecimal::add);
            }
        }
        BigDecimal total = rootAmounts.values().stream().filter(a -> a.signum() > 0)
                .reduce(Money.ZERO, BigDecimal::add);
        return roots.values().stream()
                .map(r -> {
                    BigDecimal amount = rootAmounts.get(r.getId());
                    int percent = total.signum() == 0 || amount.signum() <= 0 ? 0
                            : amount.multiply(BigDecimal.valueOf(100)).divide(total, 0, RoundingMode.HALF_UP).intValue();
                    List<SubcategoryStat> children = subs.getOrDefault(r.getId(), Map.of()).values().stream()
                            .map(c -> new SubcategoryStat(c.getId(), c.getName(), subAmounts.get(c.getId())))
                            .sorted(Comparator.comparing(SubcategoryStat::amount).reversed())
                            .toList();
                    return new CategoryStat(r.getId(), r.getName(), r.getIcon(), r.getColor(), amount,
                            counts.getOrDefault(r.getId(), 0L), percent, children);
                })
                .sorted(Comparator.comparing(CategoryStat::amount).reversed())
                .toList();
    }
}
