package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.UUID;
import org.hibernate.annotations.SortNatural;

/**
 * Depense variable plafonnee chaque mois (« enveloppe ») : courses, restaurants... Elle suit une categorie (et ses
 * sous-categories pour une categorie racine) du mois `startMonth` au mois `endMonth` inclus (sans fin si absent).
 * Le plafond change a partir d'un mois : la premiere version commence au premier mois, chaque version s'applique
 * jusqu'a la suivante. Une categorie n'a qu'une enveloppe.
 */
@Entity
@Table(name = "fin_envelope")
public class Envelope {

    private static final int MAX_LABEL = 120;

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private int position;

    /** Premier jour du premier mois suivi. */
    @Column(name = "start_month", nullable = false)
    private LocalDate startMonth;

    /** Premier jour du dernier mois suivi ; absent : sans fin. */
    @Column(name = "end_month")
    private LocalDate endMonth;

    /** Plafonds a partir d'un mois (cle = premier jour du mois) ; le premier commence a `startMonth`. */
    @ElementCollection
    @CollectionTable(name = "fin_envelope_amount", joinColumns = @JoinColumn(name = "envelope_id"))
    @MapKeyColumn(name = "from_month")
    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    @SortNatural
    private SortedMap<LocalDate, BigDecimal> amounts = new TreeMap<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Envelope() {
    }

    /** Nouvelle enveloppe suivie a partir du mois `from` avec le plafond `cap` ; libelle par defaut : la categorie. */
    public static Envelope create(Category category, String label, int position, YearMonth from, BigDecimal cap,
                                  Instant now) {
        if (category == null || from == null) {
            throw ApiException.rule("INVALID_ENVELOPE", "La categorie et le premier mois sont obligatoires.");
        }
        Envelope e = new Envelope();
        e.category = category;
        e.label = cleanLabel(label, category);
        e.position = position;
        e.startMonth = from.atDay(1);
        e.amounts.put(e.startMonth, notNegative(cap));
        e.createdAt = now;
        e.updatedAt = now;
        return e;
    }

    /** Reconstruction depuis une sauvegarde, avec l'identifiant, les mois, les plafonds et les dates d'origine. */
    static Envelope restored(UUID id, Category category, String label, int position, YearMonth start, YearMonth end,
                             Map<YearMonth, BigDecimal> caps, Instant createdAt, Instant updatedAt) {
        if (start == null || caps == null || !caps.containsKey(start)) {
            throw new IllegalArgumentException("premier mois ou plafond du premier mois absent.");
        }
        if (end != null && end.isBefore(start)) {
            throw new IllegalArgumentException("le dernier mois precede le premier.");
        }
        Envelope e = create(category, label, position, start, caps.get(start), createdAt);
        if (id != null) {
            e.id = id;
        }
        caps.forEach((month, value) -> {
            if (month.isAfter(start) && (end == null || !month.isAfter(end))) {
                e.amounts.put(month.atDay(1), notNegative(value));
            }
        });
        e.endMonth = end == null ? null : end.atDay(1);
        e.updatedAt = updatedAt != null ? updatedAt : createdAt;
        return e;
    }

    /** Change le libelle (vide : nom de la categorie) et, s'il est fourni, le rang d'affichage. */
    public void rename(String newLabel, Integer newPosition, Instant now) {
        label = cleanLabel(newLabel, category);
        if (newPosition != null) {
            position = newPosition;
        }
        updatedAt = now;
    }

    /** Suivie ce mois-ci : entre le premier et le dernier mois inclus. */
    public boolean isActive(YearMonth month) {
        LocalDate m = month.atDay(1);
        return !m.isBefore(startMonth) && (endMonth == null || !m.isAfter(endMonth));
    }

    /** Plafond du mois : la version la plus recente qui commence au plus tard ce mois-ci ; null hors suivi. */
    public BigDecimal capFor(YearMonth month) {
        if (!isActive(month)) {
            return null;
        }
        LocalDate m = month.atDay(1);
        BigDecimal result = Money.ZERO;
        for (Map.Entry<LocalDate, BigDecimal> v : amounts.entrySet()) {
            if (v.getKey().isAfter(m)) {
                break;
            }
            result = v.getValue();
        }
        return result;
    }

    /** Plafonds dates par mois croissant, le premier au premier mois suivi. */
    public SortedMap<YearMonth, BigDecimal> amountTimeline() {
        SortedMap<YearMonth, BigDecimal> timeline = new TreeMap<>();
        amounts.forEach((month, value) -> timeline.put(YearMonth.from(month), value));
        return timeline;
    }

    /** Change le plafond a partir du mois `from` (inclus) : cree ou remplace la version de ce mois. */
    public void changeAmount(YearMonth from, BigDecimal value, Instant now) {
        if (from == null || from.atDay(1).isBefore(startMonth)) {
            throw ApiException.rule("INVALID_AMOUNT_CHANGE",
                    "Le plafond ne peut pas changer avant le premier mois suivi (" + YearMonth.from(startMonth) + ").");
        }
        if (endMonth != null && from.atDay(1).isAfter(endMonth)) {
            throw ApiException.rule("INVALID_AMOUNT_CHANGE", "Cette depense variable n'est plus suivie ce mois-ci.");
        }
        amounts.put(from.atDay(1), notNegative(value));
        updatedAt = now;
    }

    /** Arrete le suivi apres le mois `last` (inclus) : plus de plafond ensuite. */
    public void end(YearMonth last, Instant now) {
        if (last == null || last.atDay(1).isBefore(startMonth)) {
            throw ApiException.rule("INVALID_ENVELOPE",
                    "Le dernier mois ne peut pas preceder le premier mois suivi (" + YearMonth.from(startMonth) + ").");
        }
        endMonth = last.atDay(1);
        List<LocalDate> obsolete = amounts.keySet().stream().filter(m -> m.isAfter(endMonth)).toList();
        obsolete.forEach(amounts::remove);
        updatedAt = now;
    }

    private static String cleanLabel(String raw, Category category) {
        String name = raw == null || raw.isBlank() ? category.getName() : raw.strip();
        if (name.length() > MAX_LABEL) {
            throw ApiException.rule("INVALID_ENVELOPE", "Le libelle est limite a " + MAX_LABEL + " caracteres.");
        }
        return name;
    }

    private static BigDecimal notNegative(BigDecimal value) {
        BigDecimal v = Money.cents(value, "Le plafond");
        if (v.signum() < 0) {
            throw ApiException.rule("INVALID_AMOUNT", "Le plafond ne peut pas etre negatif.");
        }
        return v;
    }

    public UUID getId() { return id; }
    public Category getCategory() { return category; }
    public String getLabel() { return label; }
    public int getPosition() { return position; }
    public YearMonth getStartMonth() { return YearMonth.from(startMonth); }
    public YearMonth getEndMonth() { return endMonth == null ? null : YearMonth.from(endMonth); }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
