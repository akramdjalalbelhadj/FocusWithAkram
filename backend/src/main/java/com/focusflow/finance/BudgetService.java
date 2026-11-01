package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.dto.BudgetGauge;
import com.focusflow.finance.dto.BudgetRequest;
import com.focusflow.finance.dto.BudgetResponse;
import com.focusflow.finance.dto.MonthTotals;
import com.focusflow.finance.dto.OperationResponse;
import com.focusflow.finance.dto.PreferencesRequest;
import com.focusflow.finance.dto.PreferencesResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Budget mensuel : plafond des depenses variables, objectif d'epargne et suivi. Tout est recalcule a la lecture
 * a partir des operations et des echeances calculees du mois.
 */
@Service
public class BudgetService {

    private final MonthlyBudgetRepository budgets;
    private final FinancePreferencesRepository preferences;
    private final OperationRepository operations;
    private final ScheduleService schedules;
    private final FinanceDates dates;

    public BudgetService(MonthlyBudgetRepository budgets, FinancePreferencesRepository preferences,
                         OperationRepository operations, ScheduleService schedules, FinanceDates dates) {
        this.budgets = budgets;
        this.preferences = preferences;
        this.operations = operations;
        this.schedules = schedules;
        this.dates = dates;
    }

    // ---- Preferences ------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public FinancePreferences preferences() {
        return preferences.findById(FinancePreferences.SINGLETON_ID).orElseGet(FinancePreferences::new);
    }

    @Transactional(readOnly = true)
    public PreferencesResponse preferencesResponse() {
        FinancePreferences p = preferences();
        return new PreferencesResponse(p.getSafetyReserve(), p.getSavingsFloor(), p.getDefaultVariableCap(),
                p.getDefaultSavingsTarget(), p.getWarningPercent());
    }

    @Transactional
    public void updatePreferences(PreferencesRequest r) {
        FinancePreferences p = preferences.findById(FinancePreferences.SINGLETON_ID).orElseGet(FinancePreferences::new);
        p.setSafetyReserve(nonNegative(r.safetyReserve(), "La reserve de securite"));
        p.setSavingsFloor(nonNegative(r.savingsFloor(), "Le plancher d'epargne"));
        p.setDefaultVariableCap(r.defaultVariableCap() == null ? null : nonNegative(r.defaultVariableCap(), "Le plafond"));
        p.setDefaultSavingsTarget(r.defaultSavingsTarget() == null ? null
                : nonNegative(r.defaultSavingsTarget(), "L'objectif d'epargne"));
        p.setWarningPercent(r.warningPercent());
        preferences.save(p);
    }

    // ---- Budget du mois ---------------------------------------------------------------------------

    @Transactional
    public void updateBudget(YearMonth month, BudgetRequest r) {
        MonthlyBudget b = budgets.findByMonth(month.atDay(1)).orElseGet(() -> new MonthlyBudget(month.atDay(1)));
        b.setVariableCap(r.variableCap() == null ? null : nonNegative(r.variableCap(), "Le plafond"));
        b.setSavingsTarget(r.savingsTarget() == null ? null : nonNegative(r.savingsTarget(), "L'objectif d'epargne"));
        budgets.save(b);
    }

    /** Operations du mois (par date reelle) et echeances calculees du mois (par date d'echeance). */
    @Transactional(readOnly = true)
    public List<Operation> monthPlan(YearMonth month) {
        List<Operation> plan = new ArrayList<>(operations.findBetween(month.atDay(1), month.atEndOfMonth()));
        plan.addAll(schedules.virtualOccurrences(month.atDay(1), month.atEndOfMonth()));
        return plan;
    }

    /** Calendrier financier : operations du mois hors annulees, par date. */
    @Transactional(readOnly = true)
    public List<OperationResponse> calendar(YearMonth month) {
        LocalDate today = dates.today();
        return monthPlan(month).stream()
                .filter(o -> o.getStatus() != OperationStatus.CANCELLED)
                .sorted(Comparator.comparing(Operation::getDate).thenComparing(Operation::getType))
                .map(o -> FinanceMapper.toResponse(o, today)).toList();
    }

    @Transactional(readOnly = true)
    public BudgetResponse budget(YearMonth month) {
        LocalDate today = dates.today();
        List<Operation> plan = monthPlan(month);
        MonthTotals totals = FinanceOverviewService.totals(plan);
        FinancePreferences prefs = preferences();
        MonthlyBudget b = budgets.findByMonth(month.atDay(1)).orElse(null);
        BigDecimal cap = b != null && b.getVariableCap() != null ? b.getVariableCap() : prefs.getDefaultVariableCap();
        String capSource = b != null && b.getVariableCap() != null ? "MONTH" : cap != null ? "DEFAULT" : "NONE";
        BigDecimal target = b != null && b.getSavingsTarget() != null ? b.getSavingsTarget() : prefs.getDefaultSavingsTarget();
        String targetSource = b != null && b.getSavingsTarget() != null ? "MONTH" : target != null ? "DEFAULT" : "NONE";

        BudgetGauge gauge = gauge(cap, totals.variablePaid(), prefs.getWarningPercent());
        BigDecimal essentialExpected = totals.essentialPaid().add(totals.essentialPlanned());
        BigDecimal theoretical = cap == null ? null : totals.incomeExpected().subtract(essentialExpected).subtract(cap);

        Comparator<Operation> byDate = Comparator.comparing(Operation::getDate);
        List<OperationResponse> incomes = plan.stream()
                .filter(o -> o.getType() == OperationType.INCOME).sorted(byDate)
                .map(o -> FinanceMapper.toResponse(o, today)).toList();
        List<OperationResponse> essentials = plan.stream()
                .filter(o -> o.getType() == OperationType.EXPENSE && o.isEssential()).sorted(byDate)
                .map(o -> FinanceMapper.toResponse(o, today)).toList();
        List<OperationResponse> plannedVariable = plan.stream()
                .filter(o -> o.getType() == OperationType.EXPENSE && !o.isEssential()
                        && o.getStatus() == OperationStatus.PLANNED).sorted(byDate)
                .map(o -> FinanceMapper.toResponse(o, today)).toList();
        return new BudgetResponse(month, cap, capSource, target, targetSource, prefs.getWarningPercent(), totals,
                essentialExpected, gauge.remaining(), gauge.percent(), gauge.state(), theoretical, incomes, essentials,
                plannedVariable);
    }

    /** Jauge du plafond variable pour la vue d'ensemble. */
    @Transactional(readOnly = true)
    public BudgetGauge gauge(YearMonth month, MonthTotals totals) {
        FinancePreferences prefs = preferences();
        BigDecimal cap = budgets.findByMonth(month.atDay(1)).map(MonthlyBudget::getVariableCap)
                .orElse(null);
        return gauge(cap != null ? cap : prefs.getDefaultVariableCap(), totals.variablePaid(), prefs.getWarningPercent());
    }

    /** Jauge du plafond variable ; voir {@link BudgetGauge}. */
    static BudgetGauge gauge(BigDecimal cap, BigDecimal used, int warningPercent) {
        if (cap == null) {
            return new BudgetGauge(null, used, null, null, "NONE");
        }
        BigDecimal remaining = cap.subtract(used);
        Integer percent = cap.signum() == 0 ? null
                : used.multiply(BigDecimal.valueOf(100)).divide(cap, 0, RoundingMode.HALF_UP).intValue();
        String state;
        if (used.compareTo(cap) > 0) {
            state = "OVER";
        } else if (cap.signum() > 0
                && used.multiply(BigDecimal.valueOf(100)).compareTo(cap.multiply(BigDecimal.valueOf(warningPercent))) >= 0) {
            state = "WARNING";
        } else {
            state = "OK";
        }
        return new BudgetGauge(cap, used, remaining, percent, state);
    }

    private static BigDecimal nonNegative(BigDecimal value, String field) {
        BigDecimal v = Money.cents(value, field);
        if (v.signum() < 0) {
            throw ApiException.rule("INVALID_AMOUNT", field + " ne peut pas etre negatif.");
        }
        return v;
    }
}
