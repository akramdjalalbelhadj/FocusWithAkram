package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.dto.AccountResponse;
import com.focusflow.finance.dto.CreateAccountRequest;
import com.focusflow.finance.dto.ReconcileRequest;
import com.focusflow.finance.dto.UpdateAccountRequest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Comptes, soldes reels et corrections de solde. */
@Service
public class AccountService {

    private final AccountRepository accounts;
    private final OperationRepository operations;
    private final FinanceDates dates;
    private final Clock clock;

    public AccountService(AccountRepository accounts, OperationRepository operations, FinanceDates dates, Clock clock) {
        this.accounts = accounts;
        this.operations = operations;
        this.dates = dates;
        this.clock = clock;
    }

    /** Solde reel de chaque compte : operations realisees (credits - debits) + virements recus. */
    @Transactional(readOnly = true)
    public Map<UUID, BigDecimal> balances() {
        Map<UUID, BigDecimal> result = new HashMap<>();
        for (Object[] row : operations.completedNetByAccount()) {
            result.merge((UUID) row[0], Money.orZero((BigDecimal) row[1]), BigDecimal::add);
        }
        for (Object[] row : operations.completedTransfersInByAccount()) {
            result.merge((UUID) row[0], Money.orZero((BigDecimal) row[1]), BigDecimal::add);
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> list() {
        Map<UUID, BigDecimal> balances = balances();
        return accounts.findAllByOrderByArchivedAscPositionAscNameAsc().stream()
                .map(a -> toResponse(a, balances.getOrDefault(a.getId(), Money.ZERO)))
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse get(UUID id) {
        return toResponse(find(id), balances().getOrDefault(id, Money.ZERO));
    }

    @Transactional(readOnly = true)
    public Account find(UUID id) {
        return accounts.findById(id).orElseThrow(() -> ApiException.notFound("Compte", id));
    }

    /** Cree le compte et, si le solde initial n'est pas nul, l'operation de solde initial datee. */
    @Transactional
    public UUID create(CreateAccountRequest request) {
        String name = cleanName(request.name());
        if (accounts.existsByNameIgnoreCaseAndArchivedFalse(name)) {
            throw ApiException.conflict("ACCOUNT_NAME_TAKEN", "Un compte actif porte deja ce nom.");
        }
        LocalDate today = dates.today();
        LocalDate openingDate = request.openingDate() == null ? today : request.openingDate();
        if (openingDate.isAfter(today)) {
            throw ApiException.rule("INVALID_OPERATION", "Le solde initial ne peut pas etre date dans le futur.");
        }
        Instant now = Instant.now(clock);
        Account account = new Account(name, request.type(), now);
        account.setPosition((int) accounts.count());
        accounts.save(account);
        BigDecimal opening = request.openingBalance() == null ? Money.ZERO : Money.cents(request.openingBalance(), "Le solde initial");
        if (opening.signum() != 0) {
            operations.save(Operation.create(new Operation.Draft(account, null, OperationType.OPENING_BALANCE,
                    OperationStatus.COMPLETED, opening.signum() > 0 ? Direction.CREDIT : Direction.DEBIT, openingDate,
                    opening.abs(), null, null, "Solde initial", null, false, false, null), now));
        }
        return account.getId();
    }

    @Transactional
    public void update(UUID id, UpdateAccountRequest request) {
        Account account = find(id);
        String name = cleanName(request.name());
        boolean archived = Boolean.TRUE.equals(request.archived());
        boolean reactivated = account.isArchived() && !archived;
        if ((reactivated || !name.equalsIgnoreCase(account.getName())) && accounts.existsByNameIgnoreCaseAndArchivedFalse(name)) {
            throw ApiException.conflict("ACCOUNT_NAME_TAKEN", "Un compte actif porte deja ce nom.");
        }
        if (archived && !account.isArchived()) {
            BigDecimal balance = balances().getOrDefault(id, Money.ZERO);
            if (balance.signum() != 0) {
                throw ApiException.rule("ACCOUNT_NOT_EMPTY",
                        "Un compte ne s'archive qu'avec un solde nul : videz-le par un virement ou une correction.");
            }
        }
        account.setName(name);
        account.setType(request.type());
        account.setArchived(archived);
        if (request.position() != null) {
            account.setPosition(request.position());
        }
    }

    /** Suppression reservee a un compte sans aucune operation ; sinon, archiver. */
    @Transactional
    public void delete(UUID id) {
        Account account = find(id);
        if (operations.existsForAccount(id)) {
            throw ApiException.conflict("ACCOUNT_IN_USE",
                    "Ce compte a des operations : archivez-le plutot que de le supprimer.");
        }
        accounts.delete(account);
    }

    /**
     * Rapproche le solde calcule du solde reellement constate : l'ecart devient une operation de correction
     * datee du jour, visible dans l'historique.
     */
    @Transactional
    public UUID reconcile(UUID id, ReconcileRequest request) {
        Account account = find(id);
        if (account.isArchived()) {
            throw ApiException.rule("ACCOUNT_ARCHIVED", "Ce compte est archive.");
        }
        BigDecimal actual = Money.cents(request.actualBalance(), "Le solde constate");
        BigDecimal current = balances().getOrDefault(id, Money.ZERO);
        BigDecimal gap = actual.subtract(current);
        if (gap.signum() == 0) {
            throw ApiException.rule("ALREADY_RECONCILED", "Le solde calcule correspond deja au solde constate.");
        }
        Operation correction = Operation.create(new Operation.Draft(account, null, OperationType.ADJUSTMENT,
                OperationStatus.COMPLETED, gap.signum() > 0 ? Direction.CREDIT : Direction.DEBIT, dates.today(),
                gap.abs(), null, null, "Correction du solde", request.note(), false, false, null), Instant.now(clock));
        return operations.save(correction).getId();
    }

    private AccountResponse toResponse(Account a, BigDecimal balance) {
        return new AccountResponse(a.getId(), a.getName(), a.getType(), a.isArchived(), a.getPosition(), balance,
                operations.existsForAccount(a.getId()));
    }

    private static String cleanName(String raw) {
        String name = raw == null ? "" : raw.strip();
        if (name.isEmpty() || name.length() > 80) {
            throw new IllegalArgumentException("Le nom du compte est obligatoire (80 caracteres maximum).");
        }
        return name;
    }
}
