package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.dto.LoanRequest;
import com.focusflow.finance.dto.LoanResponse;
import com.focusflow.finance.dto.LoanUpdateRequest;
import com.focusflow.finance.dto.OperationResponse;
import com.focusflow.finance.dto.RepaymentRequest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Prets accordes et emprunts. Le versement et les remboursements deplacent de l'argent sans etre des revenus ni des
 * depenses ; un remboursement attendu n'est pas de l'argent disponible.
 */
@Service
public class LoanService {

    private final LoanRepository loans;
    private final OperationRepository operations;
    private final AccountService accounts;
    private final FinanceDates dates;
    private final Clock clock;

    public LoanService(LoanRepository loans, OperationRepository operations, AccountService accounts, FinanceDates dates,
                       Clock clock) {
        this.loans = loans;
        this.operations = operations;
        this.accounts = accounts;
        this.dates = dates;
        this.clock = clock;
    }

    /** Etat calcule d'un pret. */
    public record LoanState(Loan loan, List<Operation> movements, BigDecimal repaid, BigDecimal remaining, String status,
                            boolean overdue) {
    }

    @Transactional(readOnly = true)
    public List<LoanState> states() {
        Map<UUID, List<Operation>> byLoan = new HashMap<>();
        for (Operation o : operations.findLoanMovements()) {
            byLoan.computeIfAbsent(o.getLoan().getId(), k -> new ArrayList<>()).add(o);
        }
        LocalDate today = dates.today();
        return loans.findAllOrdered().stream().map(l -> state(l, byLoan.getOrDefault(l.getId(), List.of()), today)).toList();
    }

    @Transactional(readOnly = true)
    public List<LoanResponse> list() {
        LocalDate today = dates.today();
        return states().stream().map(s -> toResponse(s, today)).toList();
    }

    @Transactional(readOnly = true)
    public LoanResponse get(UUID id) {
        return states().stream().filter(s -> s.loan().getId().equals(id)).findFirst()
                .map(s -> toResponse(s, dates.today())).orElseThrow(() -> ApiException.notFound("Pret", id));
    }

    @Transactional(readOnly = true)
    public Loan find(UUID id) {
        return loans.findById(id).orElseThrow(() -> ApiException.notFound("Pret", id));
    }

    /** Total des restes dus en cours : ce qu'on me doit (prets accordes) et ce que je dois (emprunts). */
    @Transactional(readOnly = true)
    public BigDecimal[] outstanding() {
        BigDecimal receivables = Money.ZERO;
        BigDecimal debts = Money.ZERO;
        for (LoanState s : states()) {
            if (!"OPEN".equals(s.status())) continue;
            if (s.loan().getDirection() == LoanDirection.LENT) receivables = receivables.add(s.remaining());
            else debts = debts.add(s.remaining());
        }
        return new BigDecimal[]{receivables, debts};
    }

    @Transactional
    public UUID create(LoanRequest r) {
        LocalDate today = dates.today();
        if (r.startDate().isAfter(today)) {
            throw ApiException.rule("INVALID_LOAN", "La date du pret ne peut pas etre future.");
        }
        Instant now = Instant.now(clock);
        Loan loan = loans.save(new Loan(r.person(), r.direction(), r.amount(), r.startDate(), r.dueDate(), r.notes(), now));
        if (!Boolean.FALSE.equals(r.recordDisbursement())) {
            if (r.accountId() == null) {
                throw ApiException.rule("INVALID_LOAN", "Choisissez le compte du versement.");
            }
            Account account = activeAccount(r.accountId());
            String label = (loan.getDirection() == LoanDirection.LENT ? "Pret a " : "Emprunt aupres de ") + loan.getPerson();
            Operation o = Operation.create(new Operation.Draft(account, null, loan.disbursementType(),
                    OperationStatus.COMPLETED, null, r.startDate(), loan.getPrincipal(), null, null, label, null, false,
                    false, null), now);
            o.linkLoan(loan);
            operations.save(o);
        }
        return loan.getId();
    }

    @Transactional
    public void update(UUID id, LoanUpdateRequest r) {
        find(id).describe(r.person(), r.dueDate(), r.notes(), Instant.now(clock));
    }

    /** Remboursement partiel ou total ; il ne peut pas depasser le reste du. */
    @Transactional
    public UUID repay(UUID id, RepaymentRequest r) {
        LoanState s = stateOf(id);
        Loan loan = s.loan();
        loan.requireActive();
        BigDecimal amount = Money.positive(r.amount(), "Le remboursement");
        if (amount.compareTo(s.remaining()) > 0) {
            throw ApiException.rule("REPAYMENT_EXCEEDS_REMAINING",
                    "Le remboursement depasse le reste du (" + s.remaining() + " EUR).");
        }
        if (r.date().isAfter(dates.today()) || r.date().isBefore(loan.getStartDate())) {
            throw ApiException.rule("INVALID_OPERATION", "La date du remboursement doit etre comprise entre la date du pret et aujourd'hui.");
        }
        String label = "Remboursement " + (loan.getDirection() == LoanDirection.LENT ? "de " : "a ") + loan.getPerson();
        Operation o = Operation.create(new Operation.Draft(activeAccount(r.accountId()), null, loan.repaymentType(),
                OperationStatus.COMPLETED, null, r.date(), amount, null, null, label, null, false, false, null),
                Instant.now(clock));
        o.linkLoan(loan);
        return operations.save(o).getId();
    }

    /** Regularisation : le reste du est abandonne explicitement, sans mouvement d'argent. */
    @Transactional
    public void writeOff(UUID id, String reason) {
        LoanState s = stateOf(id);
        s.loan().writeOff(s.remaining(), dates.today(), reason, Instant.now(clock));
    }

    /** Annule un pret saisi par erreur : ses mouvements sont annules (conserves dans l'historique, sans effet). */
    @Transactional
    public void cancel(UUID id) {
        LoanState s = stateOf(id);
        Instant now = Instant.now(clock);
        s.loan().cancel(now);
        for (Operation o : s.movements()) {
            if (o.getStatus() != OperationStatus.CANCELLED) o.cancel(now);
        }
    }

    private LoanState stateOf(UUID id) {
        Loan loan = find(id);
        List<Operation> movements = operations.findLoanMovements().stream()
                .filter(o -> o.getLoan().getId().equals(id)).toList();
        return state(loan, movements, dates.today());
    }

    private Account activeAccount(UUID id) {
        Account a = accounts.find(id);
        if (a.isArchived()) {
            throw ApiException.rule("ACCOUNT_ARCHIVED", "Le compte « " + a.getName() + " » est archive.");
        }
        return a;
    }

    static LoanState state(Loan loan, List<Operation> movements, LocalDate today) {
        BigDecimal repaid = movements.stream()
                .filter(o -> o.getStatus() == OperationStatus.COMPLETED && o.getType() == loan.repaymentType())
                .map(Operation::getAmount).reduce(Money.ZERO, BigDecimal::add);
        BigDecimal remaining = loan.getPrincipal().subtract(repaid).subtract(loan.getWrittenOffAmount()).max(Money.ZERO);
        String status = loan.isCancelled() ? "CANCELLED"
                : loan.getWrittenOffAmount().signum() > 0 ? "WRITTEN_OFF"
                : remaining.signum() == 0 ? "SETTLED" : "OPEN";
        boolean overdue = "OPEN".equals(status) && loan.getDueDate() != null && loan.getDueDate().isBefore(today);
        return new LoanState(loan, movements, repaid, remaining, status, overdue);
    }

    private static LoanResponse toResponse(LoanState s, LocalDate today) {
        Loan l = s.loan();
        List<OperationResponse> movements = s.movements().stream().map(o -> FinanceMapper.toResponse(o, today)).toList();
        return new LoanResponse(l.getId(), l.getPerson(), l.getDirection(), l.getPrincipal(), l.getStartDate(),
                l.getDueDate(), l.getNotes(), s.repaid(), l.getWrittenOffAmount(), l.getWrittenOffDate(),
                l.getWrittenOffReason(), s.remaining(), s.status(), s.overdue(), movements, l.getCreatedAt());
    }
}
