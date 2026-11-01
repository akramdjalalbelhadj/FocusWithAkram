package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.dto.AccountResponse;
import com.focusflow.finance.dto.GoalFeasibility;
import com.focusflow.finance.dto.GoalRequest;
import com.focusflow.finance.dto.GoalResponse;
import com.focusflow.finance.dto.MoveGoalRequest;
import com.focusflow.finance.dto.PurchaseRequest;
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

/** Objectifs d'achat : saisie, matrice, reservation, achat reel et faisabilite. */
@Service
public class GoalService {

    private final GoalRepository goals;
    private final OperationRepository operations;
    private final AccountService accounts;
    private final CategoryService categories;
    private final BudgetService budgets;
    private final ForecastService forecast;
    private final FinanceDates dates;
    private final Clock clock;

    public GoalService(GoalRepository goals, OperationRepository operations, AccountService accounts,
                       CategoryService categories, BudgetService budgets, ForecastService forecast, FinanceDates dates,
                       Clock clock) {
        this.goals = goals;
        this.operations = operations;
        this.accounts = accounts;
        this.categories = categories;
        this.budgets = budgets;
        this.forecast = forecast;
        this.dates = dates;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<GoalResponse> list() {
        Map<UUID, GoalFeasibility> feasibility = forecast.feasibilityByGoal();
        Map<UUID, Operation> purchases = purchases();
        return goals.findAllOrdered().stream()
                .map(g -> toResponse(g, feasibility.get(g.getId()), purchases.get(g.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public GoalResponse get(UUID id) {
        Goal g = find(id);
        GoalFeasibility f = g.getStatus().isOpen() ? forecast.feasibilityByGoal().get(id) : null;
        return toResponse(g, f, purchases().get(id));
    }

    @Transactional(readOnly = true)
    public Goal find(UUID id) {
        return goals.findById(id).orElseThrow(() -> ApiException.notFound("Objectif d'achat", id));
    }

    /** Apercu de faisabilite avant enregistrement (creation si `id` est absent, modification sinon). */
    @Transactional(readOnly = true)
    public GoalFeasibility preview(UUID id, GoalRequest request) {
        Goal hypothetical = Goal.create(draft(request), Instant.now(clock));
        if (id != null) {
            Goal existing = find(id);
            hypothetical = Goal.restored(id, draft(request), existing.getReservedAmount(), existing.getPosition(),
                    existing.getCreatedAt(), Instant.now(clock));
        }
        return forecast.preview(hypothetical);
    }

    @Transactional
    public UUID create(GoalRequest request) {
        return goals.save(Goal.create(draft(request), Instant.now(clock))).getId();
    }

    @Transactional
    public void update(UUID id, GoalRequest request) {
        Goal g = find(id);
        if (!g.getStatus().isOpen()) {
            throw ApiException.rule("GOAL_CLOSED", "Un objectif achete ou abandonne ne se modifie plus.");
        }
        g.apply(draft(request), Instant.now(clock));
        if (g.getReservedAmount().compareTo(g.reservationCeiling()) > 0) {
            g.reserve(g.reservationCeiling(), Instant.now(clock));
        }
    }

    /** Un objectif achete reste dans l'historique ; les autres se suppriment. */
    @Transactional
    public void delete(UUID id) {
        Goal g = find(id);
        if (g.getStatus() == GoalStatus.PURCHASED) {
            throw ApiException.rule("GOAL_PURCHASED", "Un objectif achete fait partie de l'historique : il ne se supprime pas.");
        }
        goals.delete(g);
    }

    /**
     * Fixe le montant reserve pour l'objectif. L'augmentation n'est possible que dans la limite du disponible libre
     * (disponible - autres reservations - reserve de securite).
     */
    @Transactional
    public void reserve(UUID id, BigDecimal amount) {
        Goal g = find(id);
        BigDecimal value = Money.cents(amount, "La reservation");
        if (value.signum() < 0 || value.compareTo(g.reservationCeiling()) > 0) {
            throw ApiException.rule("INVALID_RESERVATION",
                    "La reservation doit etre comprise entre 0 et le montant maximal de l'objectif.");
        }
        BigDecimal increase = value.subtract(g.getReservedAmount());
        if (increase.signum() > 0) {
            BigDecimal free = freeAvailable();
            if (increase.compareTo(free) > 0) {
                throw ApiException.rule("RESERVATION_EXCEEDS_FREE_FUNDS",
                        "Disponible libre insuffisant : " + free.max(Money.ZERO) + " EUR peuvent encore etre reserves.");
            }
        }
        g.reserve(value, Instant.now(clock));
    }

    /**
     * Enregistre l'achat reel : une depense realisee liee a l'objectif (prix et date reels), hors plafond variable ;
     * la reservation est liberee et l'objectif passe a « achete ».
     */
    @Transactional
    public UUID purchase(UUID id, PurchaseRequest r) {
        Goal g = find(id);
        if (r.date().isAfter(dates.today())) {
            throw ApiException.rule("FUTURE_COMPLETED_OPERATION", "Un achat realise ne peut pas etre date dans le futur.");
        }
        Account account = accounts.find(r.accountId());
        if (account.isArchived()) {
            throw ApiException.rule("ACCOUNT_ARCHIVED", "Le compte « " + account.getName() + " » est archive.");
        }
        Category category = r.categoryId() != null ? categories.find(r.categoryId()) : g.getCategory();
        if (category == null) {
            throw ApiException.rule("INVALID_OPERATION", "Choisissez la categorie de la depense d'achat.");
        }
        String label = r.label() == null || r.label().isBlank() ? g.getName() : r.label();
        Instant now = Instant.now(clock);
        Operation o = Operation.create(new Operation.Draft(account, null, OperationType.EXPENSE,
                OperationStatus.COMPLETED, null, r.date(), r.amount(), category, null, label, null, false, false, null), now);
        o.linkGoal(g);
        g.markPurchased(now);
        return operations.save(o).getId();
    }

    @Transactional
    public void postpone(UUID id, LocalDate target) {
        find(id).postpone(target, Instant.now(clock));
    }

    @Transactional
    public void abandon(UUID id) {
        find(id).abandon(Instant.now(clock));
    }

    @Transactional
    public void reopen(UUID id) {
        find(id).reopen(Instant.now(clock));
    }

    @Transactional
    public void move(UUID id, MoveGoalRequest r) {
        Goal g = find(id);
        g.move(r.important(), r.urgent(), r.position() == null ? g.getPosition() : r.position(), Instant.now(clock));
    }

    /** Disponible libre maintenant : disponible - reservations en cours - reserve de securite. */
    @Transactional(readOnly = true)
    public BigDecimal freeAvailable() {
        BigDecimal available = accounts.list().stream().filter(a -> a.type().isAvailable())
                .map(AccountResponse::balance).reduce(Money.ZERO, BigDecimal::add);
        BigDecimal reserved = goals.findAll().stream().filter(g -> g.getStatus().isOpen())
                .map(Goal::getReservedAmount).reduce(Money.ZERO, BigDecimal::add);
        return available.subtract(reserved).subtract(budgets.preferences().getSafetyReserve());
    }

    private Map<UUID, Operation> purchases() {
        Map<UUID, Operation> map = new HashMap<>();
        for (Operation o : operations.findGoalPurchases()) {
            map.putIfAbsent(o.getGoal().getId(), o);
        }
        return map;
    }

    private Goal.Draft draft(GoalRequest r) {
        Category category = r.categoryId() == null ? null : categories.find(r.categoryId());
        GoalStatus status = r.status() == null ? GoalStatus.PLANNED : r.status();
        if (!status.isOpen()) {
            throw ApiException.rule("INVALID_GOAL", "Un objectif se clot par l'achat ou l'abandon.");
        }
        return new Goal.Draft(r.name(), category, r.description(), r.estimatedPrice(), r.maxPrice(), r.targetDate(),
                Boolean.TRUE.equals(r.important()), Boolean.TRUE.equals(r.urgent()), status,
                Boolean.TRUE.equals(r.fundedBySavings()), r.notes());
    }

    private static GoalResponse toResponse(Goal g, GoalFeasibility f, Operation purchase) {
        String quadrant = "Q" + g.quadrantRank();
        return new GoalResponse(g.getId(), g.getName(), FinanceMapper.ref(g.getCategory()), g.getDescription(),
                g.getEstimatedPrice(), g.getMaxPrice(), g.getTargetDate(), g.isImportant(), g.isUrgent(), quadrant,
                g.getStatus(), g.getReservedAmount(), g.isFundedBySavings(), g.getPosition(), g.getNotes(),
                purchase == null ? null : purchase.getAmount(), purchase == null ? null : purchase.getDate(),
                purchase == null ? null : purchase.getId(), g.getStatus().isOpen() ? f : null, g.getCreatedAt());
    }
}
