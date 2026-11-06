package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.dto.AmountChange;
import com.focusflow.finance.dto.AmountVersion;
import com.focusflow.finance.dto.EnvelopeActualRequest;
import com.focusflow.finance.dto.EnvelopeEndRequest;
import com.focusflow.finance.dto.EnvelopeRequest;
import com.focusflow.finance.dto.EnvelopeResponse;
import com.focusflow.finance.dto.EnvelopeRow;
import com.focusflow.finance.dto.EnvelopeUpdateRequest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Depenses variables plafonnees (« enveloppes ») et leur suivi mensuel. Le depense d'un mois est calcule a la lecture
 * a partir des operations realisees (voir {@link #envelopeOf}) ; seuls le commentaire du mois et l'operation de total
 * sont enregistres.
 */
@Service
public class EnvelopeService {

    /** Suffixe du libelle de l'operation de total du mois. */
    static final String TOTAL_SUFFIX = " — total du mois";

    private final EnvelopeRepository envelopes;
    private final EnvelopeMonthRepository months;
    private final CategoryService categories;
    private final OperationRepository operations;
    private final AccountRepository accounts;
    private final FinanceDates dates;
    private final Clock clock;

    public EnvelopeService(EnvelopeRepository envelopes, EnvelopeMonthRepository months, CategoryService categories,
                           OperationRepository operations, AccountRepository accounts, FinanceDates dates, Clock clock) {
        this.envelopes = envelopes;
        this.months = months;
        this.categories = categories;
        this.operations = operations;
        this.accounts = accounts;
        this.dates = dates;
        this.clock = clock;
    }

    /**
     * Suivi des enveloppes d'un mois : une ligne par enveloppe active (dans l'ordre d'affichage) et les operations
     * comptees dans une enveloppe (les autres depenses du mois sont « autres depenses »).
     */
    public record MonthLedger(List<EnvelopeRow> rows, Set<UUID> countedOperationIds) {
    }

    // ---- Lecture ------------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<EnvelopeResponse> list() {
        YearMonth current = YearMonth.from(dates.today());
        return envelopes.findAllOrdered().stream().map(e -> toResponse(e, current)).toList();
    }

    @Transactional(readOnly = true)
    public EnvelopeResponse get(UUID id) {
        return toResponse(find(id), YearMonth.from(dates.today()));
    }

    @Transactional(readOnly = true)
    public Envelope find(UUID id) {
        return envelopes.findById(id).orElseThrow(() -> ApiException.notFound("Depense variable", id));
    }

    /** Enveloppes suivies ce mois-ci, dans l'ordre d'affichage. */
    @Transactional(readOnly = true)
    public List<Envelope> activeIn(YearMonth month) {
        return envelopes.findAllOrdered().stream().filter(e -> e.isActive(month)).toList();
    }

    /** Suivi des enveloppes du mois a partir des operations datees du mois. */
    @Transactional(readOnly = true)
    public MonthLedger ledger(YearMonth month) {
        return ledger(month, operations.findBetween(month.atDay(1), month.atEndOfMonth()));
    }

    /** Suivi des enveloppes du mois ; `monthOperations` : operations dont la date tombe dans le mois. */
    @Transactional(readOnly = true)
    public MonthLedger ledger(YearMonth month, List<Operation> monthOperations) {
        List<Envelope> active = activeIn(month);
        Map<UUID, Envelope> byCategory = byCategory(active);
        Map<UUID, BigDecimal> spent = new HashMap<>();
        Map<UUID, Integer> counts = new HashMap<>();
        Set<UUID> counted = new HashSet<>();
        for (Operation o : monthOperations) {
            Envelope e = envelopeOf(o, byCategory);
            if (e == null) continue;
            spent.merge(e.getId(), signed(o), BigDecimal::add);
            if (o.getType() == OperationType.EXPENSE) counts.merge(e.getId(), 1, Integer::sum);
            counted.add(o.getId());
        }
        Map<UUID, EnvelopeMonth> tracking = new HashMap<>();
        months.findByMonth(month.atDay(1)).forEach(m -> tracking.put(m.getEnvelopeId(), m));
        List<EnvelopeRow> rows = active.stream()
                .map(e -> row(e, month, spent.getOrDefault(e.getId(), Money.ZERO), counts.getOrDefault(e.getId(), 0),
                        tracking.get(e.getId())))
                .toList();
        return new MonthLedger(rows, counted);
    }

    /** Enveloppes actives par categorie suivie. */
    static Map<UUID, Envelope> byCategory(List<Envelope> active) {
        Map<UUID, Envelope> map = new HashMap<>();
        active.forEach(e -> map.put(e.getCategory().getId(), e));
        return map;
    }

    /**
     * Enveloppe dans laquelle compte une operation, ou null : depense realisee ou remboursement d'achat realise, hors
     * echeance d'echeancier et hors achat d'objectif (ni remboursement de l'un d'eux), dont la categorie a une
     * enveloppe active ; a defaut, celle de sa categorie racine (une sous-categorie qui a sa propre enveloppe n'est
     * donc jamais comptee deux fois).
     */
    static Envelope envelopeOf(Operation o, Map<UUID, Envelope> byCategory) {
        if (o.getStatus() != OperationStatus.COMPLETED || o.getSchedule() != null || o.getCategory() == null) {
            return null;
        }
        if (o.getType() == OperationType.EXPENSE) {
            if (o.getGoal() != null) return null;
        } else if (o.getType() == OperationType.PURCHASE_REFUND) {
            Operation origin = o.getRefundOf();
            if (origin != null && (origin.getGoal() != null || origin.getSchedule() != null)) return null;
        } else {
            return null;
        }
        Category c = o.getCategory();
        Envelope e = byCategory.get(c.getId());
        if (e == null && c.getParent() != null) {
            e = byCategory.get(c.getParent().getId());
        }
        return e;
    }

    /** Montant compte dans le depense : positif pour une depense, negatif pour un remboursement. */
    private static BigDecimal signed(Operation o) {
        return o.getType() == OperationType.PURCHASE_REFUND ? o.getAmount().negate() : o.getAmount();
    }

    // ---- Saisie -------------------------------------------------------------------------------------

    @Transactional
    public UUID create(EnvelopeRequest r) {
        Category category = categories.find(r.categoryId());
        if (category.isArchived()) {
            throw ApiException.rule("CATEGORY_ARCHIVED", "La categorie « " + category.getName() + " » est archivee.");
        }
        if (envelopes.existsByCategoryId(category.getId())) {
            throw ApiException.conflict("ENVELOPE_CATEGORY_TAKEN",
                    "La categorie « " + category.getName() + " » a deja une depense variable plafonnee.");
        }
        int position = (int) envelopes.count();
        return envelopes.save(Envelope.create(category, r.label(), position, r.fromMonth(), r.amount(),
                Instant.now(clock))).getId();
    }

    @Transactional
    public void update(UUID id, EnvelopeUpdateRequest r) {
        find(id).rename(r.label(), r.position(), Instant.now(clock));
    }

    /** Change le plafond a partir d'un mois (cree ou remplace la version de ce mois) ; les mois precedents ne changent pas. */
    @Transactional
    public void changeAmount(UUID id, AmountChange change) {
        find(id).changeAmount(change.fromMonth(), change.amount(), Instant.now(clock));
    }

    /** Arrete le suivi apres le dernier mois indique. */
    @Transactional
    public void end(UUID id, EnvelopeEndRequest r) {
        find(id).end(r.lastMonth(), Instant.now(clock));
    }

    /** Supprime l'enveloppe et son suivi mensuel ; les operations (totaux du mois compris) restent. */
    @Transactional
    public void delete(UUID id) {
        envelopes.delete(find(id));
    }

    /** Commentaire du mois (explication d'un depassement) ; vide : supprime. */
    @Transactional
    public EnvelopeRow comment(UUID id, YearMonth month, String comment) {
        Envelope e = find(id);
        requireActive(e, month);
        EnvelopeMonth tracking = tracking(e, month);
        tracking.setComment(comment);
        store(tracking);
        return rowOf(e, month);
    }

    /**
     * Saisit le total depense du mois : une operation de total (unique pour le mois) est creee, mise a jour ou
     * supprimee pour que le depense egale le montant saisi ; les autres depenses de la categorie restent comptees.
     * Datee du dernier jour d'un mois passe, ou d'aujourd'hui pour le mois en cours ; refusee pour un mois a venir.
     */
    @Transactional
    public EnvelopeRow actual(UUID id, YearMonth month, EnvelopeActualRequest r) {
        Envelope e = find(id);
        requireActive(e, month);
        LocalDate today = dates.today();
        YearMonth current = YearMonth.from(today);
        if (month.isAfter(current)) {
            throw ApiException.rule("FUTURE_COMPLETED_OPERATION",
                    "Le total d'un mois a venir ne peut pas etre saisi : il n'est pas encore depense.");
        }
        BigDecimal target = Money.cents(r.amount(), "Le montant");
        if (target.signum() < 0) {
            throw ApiException.rule("INVALID_AMOUNT", "Le montant ne peut pas etre negatif.");
        }
        EnvelopeMonth tracking = tracking(e, month);
        Operation total = tracking.getTotalOperationId() == null ? null
                : operations.findById(tracking.getTotalOperationId()).orElse(null);

        // Depense du mois hors operation de total.
        Map<UUID, Envelope> byCategory = byCategory(activeIn(month));
        BigDecimal others = Money.ZERO;
        for (Operation o : operations.findBetween(month.atDay(1), month.atEndOfMonth())) {
            if (total != null && o.getId().equals(total.getId())) continue;
            Envelope owner = envelopeOf(o, byCategory);
            if (owner != null && owner.getId().equals(e.getId())) {
                others = others.add(signed(o));
            }
        }
        BigDecimal rest = target.subtract(others);
        if (rest.signum() < 0) {
            throw ApiException.rule("ENVELOPE_TOTAL_TOO_LOW", "Les depenses deja enregistrees ce mois-ci ("
                    + others.toPlainString() + ") depassent le total saisi.");
        }
        Instant now = Instant.now(clock);
        if (rest.signum() == 0) {
            tracking.setTotalOperationId(null);
            if (total != null) {
                operations.delete(total);
            }
        } else {
            Account account = accounts.findAllByOrderByArchivedAscPositionAscNameAsc().stream().findFirst()
                    .orElseThrow(() -> ApiException.rule("NO_ACCOUNT", "Saisissez d'abord le solde de votre compte."));
            Operation.Draft draft = new Operation.Draft(account, null, OperationType.EXPENSE, OperationStatus.COMPLETED,
                    null, month.equals(current) ? today : month.atEndOfMonth(), rest, e.getCategory(), null,
                    totalLabel(e), null, false, false, null);
            if (total == null) {
                total = operations.save(Operation.create(draft, now));
            } else {
                total.apply(draft, now);
            }
            tracking.setTotalOperationId(total.getId());
        }
        if (r.comment() != null) {
            tracking.setComment(r.comment());
        }
        store(tracking);
        return rowOf(e, month);
    }

    /** Ligne de l'enveloppe dans la feuille du mois. */
    @Transactional(readOnly = true)
    public EnvelopeRow rowOf(Envelope e, YearMonth month) {
        return ledger(month).rows().stream().filter(row -> row.envelopeId().equals(e.getId())).findFirst()
                .orElseThrow(() -> invalidMonth(month));
    }

    private static String totalLabel(Envelope e) {
        String name = e.getLabel();
        int max = 120 - TOTAL_SUFFIX.length();
        return (name.length() > max ? name.substring(0, max).strip() : name) + TOTAL_SUFFIX;
    }

    private void requireActive(Envelope e, YearMonth month) {
        if (month == null || !e.isActive(month)) {
            throw invalidMonth(month);
        }
    }

    private static ApiException invalidMonth(YearMonth month) {
        return ApiException.rule("INVALID_ENVELOPE", "Cette depense variable n'est pas suivie en " + month + ".");
    }

    /** Suivi enregistre du mois, ou nouveau suivi (enregistre seulement s'il est renseigne). */
    private EnvelopeMonth tracking(Envelope e, YearMonth month) {
        return months.findById(new EnvelopeMonth.Key(e.getId(), month)).orElseGet(() -> new EnvelopeMonth(e.getId(), month));
    }

    /** Enregistre le suivi s'il est renseigne, le supprime sinon. */
    private void store(EnvelopeMonth tracking) {
        boolean stored = months.existsById(new EnvelopeMonth.Key(tracking.getEnvelopeId(), tracking.getMonth()));
        if (tracking.isEmpty()) {
            if (stored) months.delete(tracking);
        } else {
            months.save(tracking);
        }
    }

    private EnvelopeRow row(Envelope e, YearMonth month, BigDecimal spent, int count, EnvelopeMonth tracking) {
        BigDecimal cap = e.capFor(month);
        BigDecimal remaining = cap.subtract(spent);
        boolean exceeded = spent.compareTo(cap) > 0;
        String comment = tracking == null ? null : tracking.getComment();
        return new EnvelopeRow(e.getId(), e.getLabel(), FinanceMapper.ref(e.getCategory()), cap, spent, remaining,
                exceeded, comment, exceeded && comment == null, count);
    }

    private static EnvelopeResponse toResponse(Envelope e, YearMonth current) {
        return new EnvelopeResponse(e.getId(), e.getLabel(), FinanceMapper.ref(e.getCategory()), e.getPosition(),
                e.getStartMonth(), e.getEndMonth(),
                e.amountTimeline().entrySet().stream().map(v -> new AmountVersion(v.getKey(), v.getValue())).toList(),
                e.capFor(current));
    }
}
