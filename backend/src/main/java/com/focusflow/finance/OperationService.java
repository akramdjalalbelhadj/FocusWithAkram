package com.focusflow.finance;

import com.focusflow.common.PageResponse;
import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.dto.CompleteOperationRequest;
import com.focusflow.finance.dto.OperationRequest;
import com.focusflow.finance.dto.OperationResponse;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Saisie, realisation, annulation et historique des operations. */
@Service
public class OperationService {

    private static final int MAX_PAGE_SIZE = 200;
    /** Fenetre de detection des doublons probables autour de la date saisie. */
    private static final int DUPLICATE_WINDOW_DAYS = 3;

    private final OperationRepository operations;
    private final AccountService accounts;
    private final CategoryService categories;
    private final CategoryRepository categoryRepository;
    private final FinanceDates dates;
    private final Clock clock;

    public OperationService(OperationRepository operations, AccountService accounts, CategoryService categories,
                            CategoryRepository categoryRepository, FinanceDates dates, Clock clock) {
        this.operations = operations;
        this.accounts = accounts;
        this.categories = categories;
        this.categoryRepository = categoryRepository;
        this.dates = dates;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationResponse> search(OperationFilter filter, int page, int size) {
        if (filter.from() != null && filter.to() != null && filter.from().isAfter(filter.to())) {
            throw new IllegalArgumentException("La date de debut doit preceder la date de fin.");
        }
        List<UUID> categoryIds = new ArrayList<>();
        if (filter.categoryId() != null) {
            categoryIds.add(categories.find(filter.categoryId()).getId());
            categoryRepository.findByParentId(filter.categoryId()).forEach(c -> categoryIds.add(c.getId()));
        }
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE),
                Sort.by(Sort.Order.desc("date"), Sort.Order.desc("createdAt")));
        Page<Operation> result = operations.findAll(OperationSpecifications.matching(filter, categoryIds), pageable);
        LocalDate today = dates.today();
        return PageResponse.of(result, o -> FinanceMapper.toResponse(o, today));
    }

    @Transactional(readOnly = true)
    public OperationResponse get(UUID id) {
        return FinanceMapper.toResponse(find(id), dates.today());
    }

    @Transactional(readOnly = true)
    public Operation find(UUID id) {
        return operations.findById(id).orElseThrow(() -> ApiException.notFound("Operation", id));
    }

    @Transactional
    public UUID create(OperationRequest request) {
        Operation o = Operation.create(draft(request, null), Instant.now(clock));
        return operations.save(o).getId();
    }

    @Transactional
    public void update(UUID id, OperationRequest request) {
        Operation o = find(id);
        if (o.getType().isLoanMovement()) {
            throw ApiException.rule("OPERATION_NOT_EDITABLE",
                    "Un mouvement de pret ne se modifie pas : supprimez-le puis saisissez-le de nouveau depuis le pret.");
        }
        if (o.getType() == OperationType.OPENING_BALANCE || o.getType() == OperationType.ADJUSTMENT) {
            throw ApiException.rule("OPERATION_NOT_EDITABLE",
                    "Un solde initial ou une correction ne se modifie pas : saisissez une nouvelle correction du solde.");
        }
        o.apply(draft(request, o), Instant.now(clock));
    }

    /** Realise une operation prevue (salaire recu, facture payee) avec son montant et sa date reels. */
    @Transactional
    public void complete(UUID id, CompleteOperationRequest request) {
        Operation o = find(id);
        requireNotFuture(request.date());
        o.complete(request.amount(), request.date(), Instant.now(clock));
    }

    @Transactional
    public void cancel(UUID id) {
        find(id).cancel(Instant.now(clock));
    }

    /** Suppression d'une erreur de saisie. Le solde initial d'un compte ne se supprime pas : il se corrige. */
    @Transactional
    public void delete(UUID id) {
        Operation o = find(id);
        if (o.getType() == OperationType.OPENING_BALANCE) {
            throw ApiException.rule("OPERATION_NOT_DELETABLE",
                    "Le solde initial ne se supprime pas : utilisez la correction du solde du compte.");
        }
        operations.delete(o);
    }

    /** Operations proches (meme compte, type et montant, a quelques jours pres) : doublon probable a confirmer. */
    @Transactional(readOnly = true)
    public List<OperationResponse> possibleDuplicates(UUID accountId, OperationType type, BigDecimal amount, LocalDate date,
                                                      UUID excludeId) {
        if (accountId == null || type == null || amount == null || date == null) {
            return List.of();
        }
        LocalDate today = dates.today();
        return operations.findPossibleDuplicates(accountId, type, Money.positive(amount, "Le montant"),
                        date.minusDays(DUPLICATE_WINDOW_DAYS), date.plusDays(DUPLICATE_WINDOW_DAYS), excludeId)
                .stream().map(o -> FinanceMapper.toResponse(o, today)).toList();
    }

    private Operation.Draft draft(OperationRequest r, Operation existing) {
        if (r.type() == OperationType.OPENING_BALANCE || r.type() == OperationType.ADJUSTMENT) {
            throw ApiException.rule("INVALID_OPERATION",
                    "Le solde initial et les corrections se saisissent depuis le compte concerne.");
        }
        if (r.type().isLoanMovement()) {
            throw ApiException.rule("INVALID_OPERATION", "Les prets et leurs remboursements se saisissent depuis l'onglet Prets.");
        }
        if (r.status() == OperationStatus.COMPLETED) {
            requireNotFuture(r.date());
        }
        Account account = accounts.find(r.accountId());
        if (account.isArchived() && (existing == null || !existing.getAccount().getId().equals(account.getId()))) {
            throw ApiException.rule("ACCOUNT_ARCHIVED", "Le compte « " + account.getName() + " » est archive.");
        }
        Account target = null;
        if (r.targetAccountId() != null) {
            target = accounts.find(r.targetAccountId());
            boolean unchanged = existing != null && existing.getTargetAccount() != null
                    && existing.getTargetAccount().getId().equals(target.getId());
            if (target.isArchived() && !unchanged) {
                throw ApiException.rule("ACCOUNT_ARCHIVED", "Le compte « " + target.getName() + " » est archive.");
            }
        }
        Category category = null;
        if (r.categoryId() != null) {
            category = categories.find(r.categoryId());
            boolean unchanged = existing != null && existing.getCategory() != null
                    && existing.getCategory().getId().equals(category.getId());
            if (category.isArchived() && !unchanged) {
                throw ApiException.rule("CATEGORY_ARCHIVED", "La categorie « " + category.getName() + " » est archivee.");
            }
        }
        Operation refundOf = r.refundOfId() == null ? null : find(r.refundOfId());
        return new Operation.Draft(account, target, r.type(), r.status(), null, r.date(), r.amount(), category,
                r.incomeKind(), r.label(), r.description(), Boolean.TRUE.equals(r.essential()),
                Boolean.TRUE.equals(r.exceptional()), refundOf);
    }

    private void requireNotFuture(LocalDate date) {
        if (date != null && date.isAfter(dates.today())) {
            throw ApiException.rule("FUTURE_COMPLETED_OPERATION",
                    "Une operation realisee ne peut pas etre datee dans le futur : enregistrez-la comme prevue.");
        }
    }
}
