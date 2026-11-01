package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Mouvement d'argent sur un compte. Montant toujours positif ; le sens est porte par {@link Direction} et impose
 * par le type. Seules les operations realisees modifient le solde reel. Les invariants ci-dessous sont aussi
 * garantis par des contraintes SQL.
 */
@Entity
@Table(name = "fin_operation")
public class Operation {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id")
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_account_id")
    private Account targetAccount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OperationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OperationStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Direction direction;

    @Column(name = "operation_date", nullable = false)
    private LocalDate date;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    /** Montant prevu conserve lorsqu'une operation prevue est realisee : permet d'afficher l'ecart prevu / reel. */
    @Column(name = "planned_amount", precision = 12, scale = 2)
    private BigDecimal plannedAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(name = "income_kind")
    private IncomeKind incomeKind;

    @Column(nullable = false)
    private String label;

    private String description;

    @Column(nullable = false)
    private boolean essential;

    @Column(nullable = false)
    private boolean exceptional;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_of_id")
    private Operation refundOf;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Operation() {
    }

    /** Donnees d'une operation, validees ensemble. `direction` n'est lue que pour le solde initial et la correction. */
    public record Draft(Account account, Account targetAccount, OperationType type, OperationStatus status,
                        Direction direction, LocalDate date, BigDecimal amount, Category category, IncomeKind incomeKind,
                        String label, String description, boolean essential, boolean exceptional, Operation refundOf) {
    }

    public static Operation create(Draft draft, Instant now) {
        Operation o = new Operation();
        o.createdAt = now;
        o.apply(draft, now);
        return o;
    }

    /** Reconstruction depuis une sauvegarde, avec l'identifiant et les dates d'origine. */
    public static Operation restored(UUID id, Draft draft, BigDecimal plannedAmount, Instant createdAt, Instant updatedAt) {
        Operation o = create(draft, createdAt);
        if (id != null) {
            o.id = id;
        }
        if (plannedAmount != null) {
            o.plannedAmount = Money.positive(plannedAmount, "Le montant prevu");
        }
        o.updatedAt = updatedAt != null ? updatedAt : createdAt;
        return o;
    }

    /** Remplace le contenu de l'operation apres verification de tous ses invariants. */
    public void apply(Draft d, Instant now) {
        if (d.account() == null || d.type() == null || d.status() == null || d.date() == null) {
            throw ApiException.rule("INVALID_OPERATION", "Compte, type, statut et date sont obligatoires.");
        }
        BigDecimal value = Money.positive(d.amount(), "Le montant");
        String name = d.label() == null ? "" : d.label().strip();
        if (name.isEmpty() || name.length() > 120) {
            throw ApiException.rule("INVALID_OPERATION", "Le libelle est obligatoire (120 caracteres maximum).");
        }
        OperationType t = d.type();
        Direction dir = switch (t) {
            case INCOME, PURCHASE_REFUND -> Direction.CREDIT;
            case EXPENSE, TRANSFER -> Direction.DEBIT;
            case OPENING_BALANCE, ADJUSTMENT -> {
                if (d.direction() == null) {
                    throw ApiException.rule("INVALID_OPERATION", "Le sens du solde ou de la correction est obligatoire.");
                }
                yield d.direction();
            }
        };
        boolean needsCategory = t == OperationType.EXPENSE || t == OperationType.PURCHASE_REFUND;
        if (needsCategory != (d.category() != null)) {
            throw ApiException.rule("INVALID_OPERATION", needsCategory
                    ? "Une depense ou un remboursement d'achat doit avoir une categorie."
                    : "Seules les depenses et les remboursements d'achats ont une categorie.");
        }
        if ((t == OperationType.INCOME) != (d.incomeKind() != null)) {
            throw ApiException.rule("INVALID_OPERATION", t == OperationType.INCOME
                    ? "Precisez l'origine du revenu."
                    : "Seuls les revenus ont une origine de revenu.");
        }
        if (t == OperationType.TRANSFER) {
            if (d.targetAccount() == null || d.targetAccount().getId().equals(d.account().getId())) {
                throw ApiException.rule("INVALID_OPERATION", "Un virement relie deux comptes differents.");
            }
        } else if (d.targetAccount() != null) {
            throw ApiException.rule("INVALID_OPERATION", "Seul un virement a un compte destinataire.");
        }
        if (t != OperationType.EXPENSE && (d.essential() || d.exceptional())) {
            throw ApiException.rule("INVALID_OPERATION", "Seule une depense peut etre indispensable ou exceptionnelle.");
        }
        if ((t == OperationType.OPENING_BALANCE || t == OperationType.ADJUSTMENT) && d.status() != OperationStatus.COMPLETED) {
            throw ApiException.rule("INVALID_OPERATION", "Un solde initial ou une correction est toujours realise.");
        }
        if (d.refundOf() != null && (t != OperationType.PURCHASE_REFUND || d.refundOf().getType() != OperationType.EXPENSE)) {
            throw ApiException.rule("INVALID_OPERATION", "Un remboursement d'achat ne peut se rattacher qu'a une depense.");
        }
        if (d.status() != OperationStatus.COMPLETED) {
            plannedAmount = null;
        }
        account = d.account();
        targetAccount = d.targetAccount();
        type = t;
        status = d.status();
        direction = dir;
        date = d.date();
        amount = value;
        category = d.category();
        incomeKind = d.incomeKind();
        label = name;
        description = d.description() == null || d.description().isBlank() ? null : d.description().strip();
        essential = d.essential();
        exceptional = d.exceptional();
        refundOf = d.refundOf();
        updatedAt = now;
    }

    /** Realise une operation prevue avec son montant et sa date reels ; le montant prevu est conserve. */
    public void complete(BigDecimal actualAmount, LocalDate actualDate, Instant now) {
        if (status != OperationStatus.PLANNED) {
            throw ApiException.rule("OPERATION_NOT_PLANNED", "Seule une operation prevue peut etre realisee.");
        }
        BigDecimal actual = Money.positive(actualAmount, "Le montant reel");
        if (actualDate == null) {
            throw ApiException.rule("INVALID_OPERATION", "La date reelle est obligatoire.");
        }
        plannedAmount = amount;
        amount = actual;
        date = actualDate;
        status = OperationStatus.COMPLETED;
        updatedAt = now;
    }

    /** Annule l'operation : elle reste dans l'historique mais n'a plus aucun effet. */
    public void cancel(Instant now) {
        if (type == OperationType.OPENING_BALANCE || type == OperationType.ADJUSTMENT) {
            throw ApiException.rule("OPERATION_NOT_CANCELLABLE",
                    "Un solde initial ou une correction ne s'annule pas : saisissez une nouvelle correction.");
        }
        if (status == OperationStatus.CANCELLED) {
            throw ApiException.rule("OPERATION_ALREADY_CANCELLED", "L'operation est deja annulee.");
        }
        status = OperationStatus.CANCELLED;
        updatedAt = now;
    }

    /** Effet de l'operation realisee sur le compte donne (positif = entree), zero sinon. */
    public BigDecimal effectOn(UUID accountId) {
        if (status != OperationStatus.COMPLETED) {
            return Money.ZERO;
        }
        if (account.getId().equals(accountId)) {
            return direction == Direction.CREDIT ? amount : amount.negate();
        }
        if (targetAccount != null && targetAccount.getId().equals(accountId)) {
            return amount;
        }
        return Money.ZERO;
    }

    public UUID getId() { return id; }
    public Account getAccount() { return account; }
    public Account getTargetAccount() { return targetAccount; }
    public OperationType getType() { return type; }
    public OperationStatus getStatus() { return status; }
    public Direction getDirection() { return direction; }
    public LocalDate getDate() { return date; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getPlannedAmount() { return plannedAmount; }
    public Category getCategory() { return category; }
    public IncomeKind getIncomeKind() { return incomeKind; }
    public String getLabel() { return label; }
    public String getDescription() { return description; }
    public boolean isEssential() { return essential; }
    public boolean isExceptional() { return exceptional; }
    public Operation getRefundOf() { return refundOf; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
