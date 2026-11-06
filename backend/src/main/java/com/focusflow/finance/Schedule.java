package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.UUID;
import org.hibernate.annotations.SortNatural;

/**
 * Echeancier : revenu ou depense qui revient a intervalle regulier (salaire, abonnement, charge, paiement en
 * plusieurs fois). Ses echeances sont calculees a partir de la date de depart, sans derive (un 31 donne le dernier
 * jour des mois plus courts, puis de nouveau le 31). Une echeance n'est enregistree que si elle est realisee,
 * sautee ou ajustee : elle devient alors une {@link Operation} liee, unique pour sa date d'echeance.
 *
 * <p>Le montant peut changer a partir d'un mois (loyer augmente en janvier) : le montant de base vaut des la
 * premiere echeance, chaque version datee s'applique a partir de son mois jusqu'a la version suivante (voir
 * {@link #amountOn(LocalDate)}). Les echeances deja enregistrees gardent leur montant.
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

    /**
     * Montants a partir d'un mois (cle = premier jour du mois), toujours posterieurs au mois de la premiere echeance
     * et au plus tard le mois de la fin : le montant du premier mois est {@link #amount}.
     */
    @ElementCollection
    @CollectionTable(name = "fin_schedule_amount", joinColumns = @JoinColumn(name = "schedule_id"))
    @MapKeyColumn(name = "from_month")
    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    @SortNatural
    private SortedMap<LocalDate, BigDecimal> amountVersions = new TreeMap<>();

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
        if (expense && d.category() == null) {
            throw ApiException.rule("INVALID_SCHEDULE", "Une depense recurrente doit avoir une categorie.");
        }
        if (!expense && d.incomeKind() == null) {
            throw ApiException.rule("INVALID_SCHEDULE", "Precisez l'origine du revenu.");
        }
        label = name;
        type = d.type();
        kind = d.kind();
        account = d.account();
        category = d.category();
        incomeKind = expense ? null : d.incomeKind();
        amount = Money.positive(d.amount(), "Le montant");
        essential = expense && d.essential();
        frequency = d.frequency();
        intervalCount = d.intervalCount();
        startDate = d.startDate();
        endDate = d.endDate();
        notes = d.notes() == null || d.notes().isBlank() ? null : d.notes().strip();
        updatedAt = now;
        // Le montant saisi vaut des la premiere echeance : les versions qui ne s'appliquent plus sont retirees.
        pruneAmounts();
    }

    /** Restauration d'une sauvegarde : date de fin d'origine, sans les controles de saisie. */
    void restoreEndDate(LocalDate end) {
        endDate = end;
    }

    /** Restauration d'une sauvegarde : montant a partir d'un mois posterieur a la premiere echeance. */
    void restoreAmount(YearMonth from, BigDecimal value) {
        if (from == null || !from.isAfter(YearMonth.from(startDate))) {
            throw new IllegalArgumentException("montant date absent ou anterieur a la premiere echeance.");
        }
        amountVersions.put(from.atDay(1), Money.positive(value, "Le montant"));
    }

    // ---- Montants dates -----------------------------------------------------------------------------

    /**
     * Montant de l'echeance `due` : celui de la version la plus recente qui commence au plus tard le mois de
     * l'echeance, sinon le montant de base.
     */
    public BigDecimal amountOn(LocalDate due) {
        LocalDate month = due.withDayOfMonth(1);
        BigDecimal result = amount;
        for (Map.Entry<LocalDate, BigDecimal> v : amountVersions.entrySet()) {
            if (v.getKey().isAfter(month)) {
                break;
            }
            result = v.getValue();
        }
        return result;
    }

    /**
     * Montants dates tels qu'affiches : le montant du mois de la premiere echeance, puis chaque version suivante
     * jusqu'a la fin, par mois croissant.
     */
    public SortedMap<YearMonth, BigDecimal> amountTimeline() {
        SortedMap<YearMonth, BigDecimal> timeline = new TreeMap<>();
        YearMonth first = YearMonth.from(startDate);
        timeline.put(first, amountOn(startDate));
        amountVersions.forEach((month, value) -> {
            YearMonth m = YearMonth.from(month);
            if (m.isAfter(first) && (endDate == null || !month.isAfter(endDate))) {
                timeline.put(m, value);
            }
        });
        return timeline;
    }

    /** Versions datees enregistrees (hors montant de base), pour la sauvegarde. */
    public Map<LocalDate, BigDecimal> getAmountVersions() {
        return Collections.unmodifiableMap(amountVersions);
    }

    /**
     * Change le montant a partir du mois `from` (inclus) : le mois de la premiere echeance modifie le montant de
     * base, un mois suivant cree ou remplace la version de ce mois. Les mois precedents ne changent pas.
     */
    public void changeAmount(YearMonth from, BigDecimal value, Instant now) {
        YearMonth first = YearMonth.from(startDate);
        if (from == null || from.isBefore(first)) {
            throw ApiException.rule("INVALID_AMOUNT_CHANGE",
                    "Le montant ne peut pas changer avant la premiere echeance (" + first + ").");
        }
        if (endDate != null && from.atDay(1).isAfter(endDate)) {
            throw ApiException.rule("INVALID_AMOUNT_CHANGE", "L'echeancier se termine avant ce mois.");
        }
        BigDecimal v = Money.positive(value, "Le montant");
        if (from.equals(first)) {
            amount = v;
            pruneAmounts();
        } else {
            amountVersions.put(from.atDay(1), v);
        }
        updatedAt = now;
    }

    /** Supprime le changement de montant du mois `from` : le montant precedent s'applique de nouveau. */
    public void removeAmount(YearMonth from, Instant now) {
        if (from == null || !from.isAfter(YearMonth.from(startDate))) {
            throw ApiException.rule("INVALID_AMOUNT_CHANGE",
                    "Le montant de la premiere echeance ne se supprime pas : modifiez-le.");
        }
        if (amountVersions.remove(from.atDay(1)) == null) {
            throw ApiException.rule("INVALID_AMOUNT_CHANGE", "Aucun changement de montant ne commence ce mois-ci.");
        }
        updatedAt = now;
    }

    /** Retire les versions qui ne s'appliquent plus : au plus tard le mois de la premiere echeance, ou apres la fin. */
    private void pruneAmounts() {
        if (amountVersions.isEmpty()) {
            return;
        }
        LocalDate first = startDate.withDayOfMonth(1);
        List<LocalDate> obsolete = amountVersions.keySet().stream()
                .filter(m -> !m.isAfter(first) || endDate != null && m.isAfter(endDate))
                .toList();
        obsolete.forEach(amountVersions::remove);
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

    /** Cout ou revenu mensuel equivalent (analyses) au montant valable le jour `day`, arrondi au centime. */
    public BigDecimal monthlyEquivalent(LocalDate day) {
        return amountOn(day).multiply(perYear())
                .divide(BigDecimal.valueOf(12L * intervalCount), 2, RoundingMode.HALF_UP);
    }

    /** Cout ou revenu annuel equivalent, calcule directement (et non a partir du mensuel arrondi). */
    public BigDecimal annualEquivalent(LocalDate day) {
        return amountOn(day).multiply(perYear()).divide(BigDecimal.valueOf(intervalCount), 2, RoundingMode.HALF_UP);
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
            // Le montant valable a la reprise devient le montant de base.
            amount = amountOn(next);
            startDate = next;
            pruneAmounts();
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
        pruneAmounts();
        updatedAt = now;
    }

    /** Operation non enregistree representant une echeance a venir (pour les previsions et le budget). */
    public Operation virtualOccurrence(LocalDate dueDate, Instant now) {
        Operation o = Operation.create(new Operation.Draft(account, null, type, OperationStatus.PLANNED, null, dueDate,
                amountOn(dueDate), category, incomeKind, label, null, essential, false, null), now);
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
