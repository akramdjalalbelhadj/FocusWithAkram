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
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Budget mensuel : plafond des depenses variables, objectif d'epargne et suivi. Tout est recalcule a la lecture
 * a partir des operations et des echeances calculees du mois.
 *
 * <p>Plafond variable d'un mois ({@link #capFor}) : la somme des plafonds des depenses variables plafonnees
 * (enveloppes) actives ce mois-la ; sans enveloppe, le plafond saisi pour le mois, sinon le plafond par defaut des
 * preferences. Il sert au budget, a la jauge, aux alertes, a la prevision et aux statistiques.
 */
@Service
public class BudgetService {

    /** Plafond variable d'un mois et son origine : ENVELOPES, MONTH, DEFAULT ou NONE (montant absent). */
    public record Cap(BigDecimal amount, String source) {
    }

    private final MonthlyBudgetRepository budgets;
    private final FinancePreferencesRepository preferences;
    private final OperationRepository operations;
    private final ScheduleService schedules;
    private final EnvelopeRepository envelopes;
    private final FinanceDates dates;

    public BudgetService(MonthlyBudgetRepository budgets, FinancePreferencesRepository preferences,
                         OperationRepository operations, ScheduleService schedules, EnvelopeRepository envelopes,
                         FinanceDates dates) {
        this.budgets = budgets;
        this.preferences = preferences;
        this.operations = operations;
        this.schedules = schedules;
        this.envelopes = envelopes;
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
                p.getDefaultSavingsTarget(), p.getWarningPercent(), p.isTutorialDone());
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
        if (r.tutorialDone() != null) {
            p.setTutorialDone(r.tutorialDone());
        }
        preferences.save(p);
    }

    // ---- Plafond variable et objectif d'epargne ------------------------------------------------------

    /** Plafond variable du mois ; voir {@link BudgetService}. */
    @Transactional(readOnly = true)
    public Cap capFor(YearMonth month) {
        return capsBetween(month, month).get(month);
    }

    /** Plafond variable de chaque mois de `from` a `to` inclus (une seule lecture des enveloppes et des budgets). */
    @Transactional(readOnly = true)
    public Map<YearMonth, Cap> capsBetween(YearMonth from, YearMonth to) {
        List<Envelope> all = envelopes.findAllOrdered();
        Map<YearMonth, MonthlyBudget> byMonth = new HashMap<>();
        budgets.findAllByOrderByMonthAsc().forEach(b -> byMonth.put(YearMonth.from(b.getMonth()), b));
        BigDecimal defaultCap = preferences().getDefaultVariableCap();
        Map<YearMonth, Cap> caps = new LinkedHashMap<>();
        for (YearMonth m = from; !m.isAfter(to); m = m.plusMonths(1)) {
            BigDecimal sum = null;
            for (Envelope e : all) {
                BigDecimal cap = e.capFor(m);
                if (cap != null) sum = sum == null ? cap : sum.add(cap);
            }
            MonthlyBudget b = byMonth.get(m);
            if (sum != null) caps.put(m, new Cap(sum, "ENVELOPES"));
            else if (b != null && b.getVariableCap() != null) caps.put(m, new Cap(b.getVariableCap(), "MONTH"));
            else if (defaultCap != null) caps.put(m, new Cap(defaultCap, "DEFAULT"));
            else caps.put(m, new Cap(null, "NONE"));
        }
        return caps;
    }

    /** Objectif d'epargne du mois : valeur du mois, sinon valeur par defaut (null si aucune). */
    @Transactional(readOnly = true)
    public BigDecimal savingsTargetFor(YearMonth month) {
        BigDecimal target = budgets.findByMonth(month.atDay(1)).map(MonthlyBudget::getSavingsTarget).orElse(null);
        return target != null ? target : preferences().getDefaultSavingsTarget();
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
        Cap variableCap = capFor(month);
        BigDecimal cap = variableCap.amount();
        String capSource = variableCap.source();
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

    /** Jauge du plafond variable pour la vue d'ensemble et les alertes. */
    @Transactional(readOnly = true)
    public BudgetGauge gauge(YearMonth month, MonthTotals totals) {
        return gauge(capFor(month).amount(), totals.variablePaid(), preferences().getWarningPercent());
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
