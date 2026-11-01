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
 * Objectif d'achat. Comme les taches, son quadrant derive de deux criteres independants : important et urgent.
 * La reservation affecte une part du disponible a l'objectif (argent toujours sur le compte, mais plus libre).
 * Planifier ne cree aucune operation ; l'achat reel est une depense liee.
 */
@Entity
@Table(name = "fin_goal")
public class Goal {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    private String description;

    @Column(name = "estimated_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedPrice;

    @Column(name = "max_price", precision = 12, scale = 2)
    private BigDecimal maxPrice;

    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    @Column(nullable = false)
    private boolean important;

    @Column(nullable = false)
    private boolean urgent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GoalStatus status = GoalStatus.PLANNED;

    @Column(name = "reserved_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal reservedAmount = Money.ZERO;

    /** Peut puiser dans l'epargne existante, au-dessus du plancher d'epargne (decision D3). */
    @Column(name = "funded_by_savings", nullable = false)
    private boolean fundedBySavings;

    @Column(nullable = false)
    private int position;

    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Goal() {
    }

    public record Draft(String name, Category category, String description, BigDecimal estimatedPrice,
                        BigDecimal maxPrice, LocalDate targetDate, boolean important, boolean urgent,
                        GoalStatus status, boolean fundedBySavings, String notes) {
    }

    public static Goal create(Draft draft, Instant now) {
        Goal g = new Goal();
        g.createdAt = now;
        g.apply(draft, now);
        return g;
    }

    /** Reconstruction depuis une sauvegarde, avec l'identifiant, la reservation et les dates d'origine. */
    public static Goal restored(UUID id, Draft draft, BigDecimal reserved, int position, Instant createdAt,
                                Instant updatedAt) {
        Goal g = create(draft, createdAt);
        if (id != null) {
            g.id = id;
        }
        g.position = position;
        if (reserved != null && draft.status() != null && draft.status().isOpen()) {
            g.reservedAmount = Money.cents(reserved, "La reservation").max(Money.ZERO);
        }
        g.updatedAt = updatedAt != null ? updatedAt : createdAt;
        return g;
    }

    public void apply(Draft d, Instant now) {
        String n = d.name() == null ? "" : d.name().strip();
        if (n.isEmpty() || n.length() > 120) {
            throw ApiException.rule("INVALID_GOAL", "Le nom est obligatoire (120 caracteres maximum).");
        }
        if (d.targetDate() == null) {
            throw ApiException.rule("INVALID_GOAL", "La date cible est obligatoire.");
        }
        BigDecimal price = Money.positive(d.estimatedPrice(), "Le prix estime");
        BigDecimal max = d.maxPrice() == null ? null : Money.positive(d.maxPrice(), "Le montant maximal");
        if (max != null && max.compareTo(price) < 0) {
            throw ApiException.rule("INVALID_GOAL", "Le montant maximal acceptable ne peut pas etre inferieur au prix estime.");
        }
        GoalStatus s = d.status() == null ? GoalStatus.PLANNED : d.status();
        if (!s.isOpen() && s != status) {
            throw ApiException.rule("INVALID_GOAL", "Un objectif se clot par l'achat ou l'abandon, pas par modification.");
        }
        name = n;
        category = d.category();
        description = d.description() == null || d.description().isBlank() ? null : d.description().strip();
        estimatedPrice = price;
        maxPrice = max;
        targetDate = d.targetDate();
        important = d.important();
        urgent = d.urgent();
        status = s;
        fundedBySavings = d.fundedBySavings();
        notes = d.notes() == null || d.notes().isBlank() ? null : d.notes().strip();
        updatedAt = now;
    }

    /** Montant le plus eleve a reserver : le maximum acceptable, a defaut le prix estime. */
    public BigDecimal reservationCeiling() {
        return maxPrice != null ? maxPrice : estimatedPrice;
    }

    public void reserve(BigDecimal amount, Instant now) {
        requireOpen();
        BigDecimal value = Money.cents(amount, "La reservation");
        if (value.signum() < 0 || value.compareTo(reservationCeiling()) > 0) {
            throw ApiException.rule("INVALID_RESERVATION",
                    "La reservation doit etre comprise entre 0 et le montant maximal de l'objectif.");
        }
        reservedAmount = value;
        updatedAt = now;
    }

    /** Deplacement dans la matrice : quadrant (important / urgent) et ordre. */
    public void move(boolean important, boolean urgent, int position, Instant now) {
        this.important = important;
        this.urgent = urgent;
        this.position = position;
        updatedAt = now;
    }

    public void markPurchased(Instant now) {
        requireOpen();
        status = GoalStatus.PURCHASED;
        reservedAmount = Money.ZERO;
        updatedAt = now;
    }

    public void abandon(Instant now) {
        requireOpen();
        status = GoalStatus.ABANDONED;
        reservedAmount = Money.ZERO;
        updatedAt = now;
    }

    /** Reporte l'objectif a une nouvelle date ; la reservation est conservee. */
    public void postpone(LocalDate newTarget, Instant now) {
        requireOpen();
        if (newTarget == null) {
            throw ApiException.rule("INVALID_GOAL", "La nouvelle date cible est obligatoire.");
        }
        targetDate = newTarget;
        status = GoalStatus.POSTPONED;
        updatedAt = now;
    }

    /** Rouvre un objectif abandonne (la reservation repart de zero). */
    public void reopen(Instant now) {
        if (status != GoalStatus.ABANDONED) {
            throw ApiException.rule("GOAL_NOT_ABANDONED", "Seul un objectif abandonne peut etre rouvert.");
        }
        status = GoalStatus.CONSIDERED;
        updatedAt = now;
    }

    /** Rang de priorite : Q1 (important et urgent), Q2 (important), Q3 (urgent), Q4. */
    public int quadrantRank() {
        if (important && urgent) return 1;
        if (important) return 2;
        if (urgent) return 3;
        return 4;
    }

    private void requireOpen() {
        if (!status.isOpen()) {
            throw ApiException.rule("GOAL_CLOSED", "Cet objectif est deja achete ou abandonne.");
        }
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public Category getCategory() { return category; }
    public String getDescription() { return description; }
    public BigDecimal getEstimatedPrice() { return estimatedPrice; }
    public BigDecimal getMaxPrice() { return maxPrice; }
    public LocalDate getTargetDate() { return targetDate; }
    public boolean isImportant() { return important; }
    public boolean isUrgent() { return urgent; }
    public GoalStatus getStatus() { return status; }
    public BigDecimal getReservedAmount() { return reservedAmount; }
    public boolean isFundedBySavings() { return fundedBySavings; }
    public int getPosition() { return position; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
