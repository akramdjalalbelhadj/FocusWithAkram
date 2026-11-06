package com.focusflow.finance;

import com.focusflow.finance.dto.AccountResponse;
import com.focusflow.finance.dto.EnvelopeRow;
import com.focusflow.finance.dto.MonthSheet;
import com.focusflow.finance.dto.MonthSheetTotals;
import com.focusflow.finance.dto.OperationResponse;
import com.focusflow.finance.dto.SheetRow;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Feuille du mois (docs/produit/mes-achats/feuille-du-mois.md) : revenus et depenses fixes prevus et reels, depenses
 * variables plafonnees, autres depenses et epargne. Tout est calcule a la lecture.
 *
 * <p>Une echeance d'echeancier appartient au mois de sa date d'echeance (un salaire de novembre recu le 1er decembre
 * reste dans la feuille de novembre) ; toute autre operation appartient au mois de sa date.
 */
@Service
public class MonthSheetService {

    private static final Comparator<SheetRow> ROW_ORDER = Comparator
            .comparing((SheetRow r) -> r.dueDate() != null ? r.dueDate() : r.date())
            .thenComparing(SheetRow::label, String.CASE_INSENSITIVE_ORDER)
            .thenComparing(SheetRow::key);

    private final AccountService accounts;
    private final OperationRepository operations;
    private final ScheduleService schedules;
    private final EnvelopeService envelopes;
    private final BudgetService budgets;
    private final FinanceDates dates;

    public MonthSheetService(AccountService accounts, OperationRepository operations, ScheduleService schedules,
                             EnvelopeService envelopes, BudgetService budgets, FinanceDates dates) {
        this.accounts = accounts;
        this.operations = operations;
        this.schedules = schedules;
        this.envelopes = envelopes;
        this.budgets = budgets;
        this.dates = dates;
    }

    @Transactional(readOnly = true)
    public MonthSheet sheet(YearMonth month) {
        LocalDate today = dates.today();
        YearMonth current = YearMonth.from(today);
        String period = month.isBefore(current) ? "PAST" : month.isAfter(current) ? "FUTURE" : "CURRENT";
        AccountResponse account = accounts.list().stream().findFirst().orElse(null);
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();

        // Operations datees du mois (hors echeances) et echeances du mois (enregistrees ou calculees).
        List<Operation> dated = operations.findBetween(from, to).stream().filter(o -> o.getSchedule() == null).toList();
        List<Operation> occurrences = new ArrayList<>(operations.findOccurrencesBetween(from, to));
        occurrences.addAll(schedules.virtualOccurrences(from, to));

        List<SheetRow> incomes = new ArrayList<>();
        List<SheetRow> fixed = new ArrayList<>();
        for (Operation o : occurrences) {
            (o.getType() == OperationType.INCOME ? incomes : fixed).add(occurrenceRow(o, today));
        }
        for (Operation o : dated) {
            if (o.getType() == OperationType.INCOME) incomes.add(oneOffRow(o, today));
        }
        incomes.sort(ROW_ORDER);
        fixed.sort(ROW_ORDER);

        EnvelopeService.MonthLedger ledger = envelopes.ledger(month, dated);
        List<OperationResponse> others = dated.stream()
                .filter(o -> o.getStatus() == OperationStatus.COMPLETED
                        && (o.getType() == OperationType.EXPENSE || o.getType() == OperationType.PURCHASE_REFUND)
                        && !ledger.countedOperationIds().contains(o.getId()))
                .sorted(Comparator.comparing(Operation::getDate).thenComparing(Operation::getCreatedAt).reversed())
                .map(o -> FinanceMapper.toResponse(o, today))
                .toList();

        // Depenses payees du mois, nettes des remboursements, comme le bilan du mois (echeances par date d'echeance).
        List<Operation> sheetOperations = new ArrayList<>(dated);
        sheetOperations.addAll(occurrences);
        BigDecimal expensesActual = FinanceOverviewService.totals(sheetOperations).expensesPaid();

        BigDecimal incomePlanned = plannedOf(incomes);
        BigDecimal incomeActual = actualOf(incomes);
        BigDecimal fixedPlanned = plannedOf(fixed);
        BigDecimal fixedActual = actualOf(fixed);
        BigDecimal variablePlanned = ledger.rows().stream().map(EnvelopeRow::cap).reduce(Money.ZERO, BigDecimal::add);
        BigDecimal variableActual = ledger.rows().stream().map(EnvelopeRow::spent).reduce(Money.ZERO, BigDecimal::add);
        BigDecimal expensesPlanned = fixedPlanned.add(variablePlanned);
        MonthSheetTotals totals = new MonthSheetTotals(incomePlanned, incomeActual, fixedPlanned, fixedActual,
                variablePlanned, variableActual, expensesActual.subtract(fixedActual).subtract(variableActual),
                expensesPlanned, expensesActual, incomePlanned.subtract(expensesPlanned),
                incomeActual.subtract(expensesActual));
        return new MonthSheet(month, today, period, account, incomes, fixed, ledger.rows(), others, totals,
                budgets.savingsTargetFor(month));
    }

    /** Ligne d'une echeance d'echeancier, enregistree (realisee, sautee ou ajustee) ou calculee. */
    private static SheetRow occurrenceRow(Operation o, LocalDate today) {
        Schedule s = o.getSchedule();
        boolean done = o.getStatus() == OperationStatus.COMPLETED;
        BigDecimal planned = !done ? o.getAmount()
                : o.getPlannedAmount() != null ? o.getPlannedAmount() : s.amountOn(o.getDueDate());
        BigDecimal actual = done ? o.getAmount() : null;
        return new SheetRow(s.getId() + "/" + o.getDueDate(), s.getId(), o.getDueDate(),
                o.isVirtual() ? null : o.getId(), s.getLabel(), FinanceMapper.ref(o.getCategory()), o.getIncomeKind(),
                o.getDate(), planned, actual, difference(planned, actual), status(o, today), o.getDescription(),
                !o.isVirtual() && o.getStatus() == OperationStatus.PLANNED, o.isEssential());
    }

    /** Ligne d'un revenu ponctuel (non lie a un echeancier) : le prevu est son montant, ou le prevu conserve. */
    private static SheetRow oneOffRow(Operation o, LocalDate today) {
        boolean done = o.getStatus() == OperationStatus.COMPLETED;
        BigDecimal planned = done ? o.getPlannedAmount() : o.getAmount();
        BigDecimal actual = done ? o.getAmount() : null;
        return new SheetRow(o.getId().toString(), null, null, o.getId(), o.getLabel(), FinanceMapper.ref(o.getCategory()),
                o.getIncomeKind(), o.getDate(), planned, actual, difference(planned, actual), status(o, today),
                o.getDescription(), false, o.isEssential());
    }

    private static String status(Operation o, LocalDate today) {
        return switch (o.getStatus()) {
            case COMPLETED -> "DONE";
            case CANCELLED -> "SKIPPED";
            case PLANNED -> o.getDate().isBefore(today) ? "LATE" : "PLANNED";
        };
    }

    private static BigDecimal difference(BigDecimal planned, BigDecimal actual) {
        return planned == null || actual == null ? null : actual.subtract(planned);
    }

    /** Somme des prevus des lignes non sautees. */
    private static BigDecimal plannedOf(List<SheetRow> rows) {
        return rows.stream().filter(r -> !"SKIPPED".equals(r.status()) && r.planned() != null)
                .map(SheetRow::planned).reduce(Money.ZERO, BigDecimal::add);
    }

    /** Somme des reels des lignes realisees. */
    private static BigDecimal actualOf(List<SheetRow> rows) {
        return rows.stream().filter(r -> r.actual() != null).map(SheetRow::actual).reduce(Money.ZERO, BigDecimal::add);
    }
}
