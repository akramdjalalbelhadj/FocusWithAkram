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
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Echeancier : revenu ou depense qui revient a intervalle regulier (salaire, abonnement, charge, paiement en
 * plusieurs fois). Ses echeances sont calculees a partir de la date de depart, sans derive (un 31 donne le dernier
 * jour des mois plus courts, puis de nouveau le 31). Une echeance n'est enregistree que si elle est realisee,
 * sautee ou ajustee : elle devient alors une {@link Operation} liee, unique pour sa date d'echeance.
 */
@Entity
@Table(name = "fin_schedule")
public class Schedule {

    /** Garde-fou contre une boucle infinie sur des donnees incoherentes (bien au-dela de 24 mois hebdomadaires). */
    private static final int MAX_OCCURRENCES = 5000;

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OperationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScheduleKind kind;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id")
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(name = "income_kind")
    private IncomeKind incomeKind;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private boolean essential;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Frequency frequency;

    @Column(name = "interval_count", nullable = false)
    private int intervalCount = 1;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScheduleStatus status = ScheduleStatus.ACTIVE;

    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Schedule() {
    }

    public record Draft(String label, OperationType type, ScheduleKind kind, Account account, Category category,
                        IncomeKind incomeKind, BigDecimal amount, boolean essential, Frequency frequency,
                        int intervalCount, LocalDate startDate, LocalDate endDate, String notes) {
    }

    public static Schedule create(Draft draft, Instant now) {
        Schedule s = new Schedule();
        s.createdAt = now;
        s.apply(draft, now);
        return s;
    }

    /** Reconstruction depuis une sauvegarde, avec l'identifiant, le statut et les dates d'origine. */
    public static Schedule restored(UUID id, Draft draft, ScheduleStatus status, Instant createdAt, Instant updatedAt) {
        Schedule s = create(draft, createdAt);
        if (id != null) {
            s.id = id;
        }
        s.status = status == null ? ScheduleStatus.ACTIVE : status;
        s.updatedAt = updatedAt != null ? updatedAt : createdAt;
        return s;
    }

    public void apply(Draft d, Instant now) {
        String name = d.label() == null ? "" : d.label().strip();
        if (name.isEmpty() || name.length() > 120) {
            throw ApiException.rule("INVALID_SCHEDULE", "Le libelle est obligatoire (120 caracteres maximum).");
        }
        if (d.type() != OperationType.INCOME && d.type() != OperationType.EXPENSE) {
            throw ApiException.rule("INVALID_SCHEDULE", "Un echeancier est un revenu ou une depense.");
        }
        if (d.kind() == null || d.account() == null || d.frequency() == null || d.startDate() == null) {
            throw ApiException.rule("INVALID_SCHEDULE", "Nature, compte, periodicite et premiere echeance sont obligatoires.");
        }
        if (d.intervalCount() < 1 || d.intervalCount() > 24) {
            throw ApiException.rule("INVALID_SCHEDULE", "L'intervalle doit etre compris entre 1 et 24.");
        }
        if (d.endDate() != null && d.endDate().isBefore(d.startDate())) {
            throw ApiException.rule("INVALID_SCHEDULE", "La date de fin precede la premiere echeance.");
        }
        boolean expense = d.type() == OperationType.EXPENSE;
        if (expense != (d.category() != null)) {
            throw ApiException.rule("INVALID_SCHEDULE", expense
                    ? "Une depense recurrente doit avoir une categorie." : "Un revenu n'a pas de categorie.");
        }
        if (!expense && d.incomeKind() == null) {
            throw ApiException.rule("INVALID_SCHEDULE", "Precisez l'origine du revenu.");
        }
        label = name;
        type = d.type();
        kind = d.kind();
        account = d.account();
        category = expense ? d.category() : null;
        incomeKind = expense ? null : d.incomeKind();
        amount = Money.positive(d.amount(), "Le montant");
        essential = expense && d.essential();
        frequency = d.frequency();
        intervalCount = d.intervalCount();
        startDate = d.startDate();
        endDate = d.endDate();
        notes = d.notes() == null || d.notes().isBlank() ? null : d.notes().strip();
        updatedAt = now;
    }

    /** Restauration d'une sauvegarde : date de fin d'origine, sans les controles de saisie. */
    void restoreEndDate(LocalDate end) {
        endDate = end;
    }

    /** Echeance de rang k (0 = premiere), calculee depuis la date de depart pour eviter toute derive. */
    public LocalDate nth(int k) {
        long step = (long) k * intervalCount;
        return switch (frequency) {
            case WEEKLY -> startDate.plusWeeks(step);
            case MONTHLY -> startDate.plusMonths(step);
            case YEARLY -> startDate.plusYears(step);
        };
    }

    /** Echeances theoriques comprises dans [from, to], bornees par la date de fin ; aucune si suspendu. */
    public List<LocalDate> dueDatesBetween(LocalDate from, LocalDate to) {
        List<LocalDate> dates = new ArrayList<>();
        if (status == ScheduleStatus.PAUSED || from.isAfter(to)) {
            return dates;
        }
        for (int k = 0; k < MAX_OCCURRENCES; k++) {
            LocalDate d = nth(k);
            if (d.isAfter(to) || (endDate != null && d.isAfter(endDate))) {
                break;
            }
            if (!d.isBefore(from)) {
                dates.add(d);
            }
        }
        return dates;
    }

    /** Prochaine echeance a partir de `day` (inclus), ou null s'il n'y en a plus. */
    public LocalDate nextDueDate(LocalDate day) {
        if (status != ScheduleStatus.ACTIVE) {
            return null;
        }
        for (int k = 0; k < MAX_OCCURRENCES; k++) {
            LocalDate d = nth(k);
            if (endDate != null && d.isAfter(endDate)) {
                return null;
            }
            if (!d.isBefore(day)) {
                return d;
            }
        }
        return null;
    }

    /** Cout ou revenu mensuel equivalent (analyses), arrondi au centime. */
    public BigDecimal monthlyEquivalent() {
        return amount.multiply(perYear()).divide(BigDecimal.valueOf(12L * intervalCount), 2, RoundingMode.HALF_UP);
    }

    /** Cout ou revenu annuel equivalent, calcule directement (et non a partir du mensuel arrondi). */
    public BigDecimal annualEquivalent() {
        return amount.multiply(perYear()).divide(BigDecimal.valueOf(intervalCount), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal perYear() {
        return switch (frequency) {
            case WEEKLY -> BigDecimal.valueOf(52);
            case MONTHLY -> BigDecimal.valueOf(12);
            case YEARLY -> BigDecimal.ONE;
        };
    }

    /** Suspend l'echeancier : plus aucune echeance n'est proposee jusqu'a la reprise. */
    public void pause(Instant now) {
        if (status != ScheduleStatus.ACTIVE) {
            throw ApiException.rule("SCHEDULE_NOT_ACTIVE", "Seul un echeancier actif peut etre suspendu.");
        }
        status = ScheduleStatus.PAUSED;
        updatedAt = now;
    }

    /** Reprend a la prochaine echeance (sur le meme rythme) a partir d'aujourd'hui : la periode suspendue est ignoree. */
    public void resume(LocalDate today, Instant now) {
        if (status != ScheduleStatus.PAUSED) {
            throw ApiException.rule("SCHEDULE_NOT_PAUSED", "Seul un echeancier suspendu peut reprendre.");
        }
        status = ScheduleStatus.ACTIVE;
        LocalDate next = nextDueDate(today);
        if (next == null) {
            status = ScheduleStatus.ENDED;
        } else {
            startDate = next;
        }
        updatedAt = now;
    }

    /**
     * Resilie l'echeancier : plus d'echeance apres `lastDay`. Resilie avant sa premiere echeance, il n'en a aucune
     * (date de fin a la veille de la premiere echeance).
     */
    public void end(LocalDate lastDay, Instant now) {
        if (status == ScheduleStatus.ENDED) {
            throw ApiException.rule("SCHEDULE_ALREADY_ENDED", "Cet echeancier est deja termine.");
        }
        LocalDate last = endDate != null && endDate.isBefore(lastDay) ? endDate : lastDay;
        endDate = last.isBefore(startDate) ? startDate.minusDays(1) : last;
        status = ScheduleStatus.ENDED;
        updatedAt = now;
    }

    /** Operation non enregistree representant une echeance a venir (pour les previsions et le budget). */
    public Operation virtualOccurrence(LocalDate dueDate, Instant now) {
        Operation o = Operation.create(new Operation.Draft(account, null, type, OperationStatus.PLANNED, null, dueDate,
                amount, category, incomeKind, label, null, essential, false, null), now);
        o.linkOccurrence(this, dueDate);
        o.markVirtual();
        return o;
    }

    public UUID getId() { return id; }
    public String getLabel() { return label; }
    public OperationType getType() { return type; }
    public ScheduleKind getKind() { return kind; }
    public Account getAccount() { return account; }
    public Category getCategory() { return category; }
    public IncomeKind getIncomeKind() { return incomeKind; }
    public BigDecimal getAmount() { return amount; }
    public boolean isEssential() { return essential; }
    public Frequency getFrequency() { return frequency; }
    public int getIntervalCount() { return intervalCount; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public ScheduleStatus getStatus() { return status; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
