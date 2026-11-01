package com.focusflow.finance;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Moteur de prevision de tresorerie et de faisabilite des achats (specification « Mes achats », § 6 et § 7).
 * Calcul pur, sans acces aux donnees : les entrees sont preparees par {@link ForecastService}, ce qui permet de
 * tester chaque regle avec des scenarios controles (et, plus tard, de simuler des hypotheses).
 *
 * <p>Principe : on calcule jour par jour le disponible (comptes courants et especes) et l'epargne prevus, en fin
 * de journee. Un achat de montant A a la date d est realisable si, apres avoir retire A a partir de d, le disponible
 * libre reste au-dessus de la reserve de securite a toutes les dates de [d, d + {@value #CHECK_WINDOW_DAYS} jours] :
 * un achat paye juste avant le loyer peut etre « possible » le jour meme et mettre en defaut une semaine plus tard.
 * Les objectifs sont traites par ordre de priorite ; chaque objectif retenu retire son montant avant d'evaluer le
 * suivant : les memes fonds ne sont jamais promis deux fois.
 */
public final class ForecastEngine {

    /** Fenetre de controle apres la date d'achat (environ trois mois). */
    public static final int CHECK_WINDOW_DAYS = 92;
    /** Marge en dessous de laquelle un achat realisable est signale « risque » : 10 % du prix. */
    static final BigDecimal SAFE_MARGIN_RATIO = new BigDecimal("0.10");

    private ForecastEngine() {
    }

    /** Mouvement prevu a une date : effets sur le disponible et sur l'epargne ; `lateIncome` = revenu deja en retard. */
    public record Event(LocalDate date, BigDecimal available, BigDecimal savings, boolean lateIncome) {
    }

    /**
     * Mois de prevision : depenses variables encore a anticiper (reparties uniformement sur les jours restants)
     * et epargne a mettre de cote (retiree du disponible a `setAsideDate`, « se payer en premier »).
     */
    public record Month(YearMonth month, BigDecimal discretionary, BigDecimal savingsToSetAside, LocalDate setAsideDate) {
    }

    /** Objectif ouvert, fourni dans l'ordre de priorite. `reserved` : part du disponible deja affectee. */
    public record GoalInput(UUID id, BigDecimal price, BigDecimal reserved, LocalDate targetDate, boolean fundedBySavings) {
    }

    public record Input(LocalDate today, LocalDate horizon, BigDecimal available, BigDecimal savings, BigDecimal reserve,
                        BigDecimal savingsFloor, List<Event> events, List<Month> months, List<GoalInput> goals) {
    }

    public enum Verdict { FEASIBLE, RISKY, NOT_FEASIBLE }

    /**
     * Resultat pour un objectif.
     * <ul>
     *   <li>{@code evaluatedDate} : date cible (ou aujourd'hui si elle est passee) ;</li>
     *   <li>{@code feasibleDate} : premiere date ou l'achat est realisable (null si aucune dans l'horizon) ;</li>
     *   <li>{@code retainedDate} : date d'achat retenue pour la prevision (cible si realisable, sinon premiere date
     *       realisable) ;</li>
     *   <li>{@code availableAtDate} : disponible libre prevu a la date evaluee, reservation de l'objectif comprise ;</li>
     *   <li>{@code lowestAfterPurchase} : point le plus bas du disponible libre dans la fenetre, apres l'achat ;</li>
     *   <li>{@code margin} : point le plus bas - reserve de securite ;</li>
     *   <li>{@code fromSavings} : part financee par l'epargne (objectif « finance par l'epargne ») ;</li>
     *   <li>{@code affordableAtDate} : montant le plus eleve realisable a la date evaluee.</li>
     * </ul>
     */
    public record GoalResult(UUID id, Verdict verdict, LocalDate evaluatedDate, LocalDate feasibleDate,
                             LocalDate retainedDate, BigDecimal need, BigDecimal reserved, BigDecimal availableAtDate,
                             BigDecimal lowestAfterPurchase, BigDecimal margin, BigDecimal fromSavings,
                             BigDecimal affordableAtDate, boolean dependsOnLateIncome) {
    }

    /** Point de la courbe : disponible et epargne prevus, puis disponible apres les achats retenus. */
    public record Point(LocalDate date, BigDecimal available, BigDecimal savings, BigDecimal afterGoals) {
    }

    public record Result(List<Point> points, List<GoalResult> goals, Point lowest) {
    }

    /** Controle d'une date d'achat candidate. */
    private record Check(BigDecimal margin, BigDecimal marginWithoutLate, BigDecimal freeAtDate, BigDecimal lowest,
                         BigDecimal fromSavings, BigDecimal affordable) {
    }

    public static Result run(Input in) {
        int n = (int) ChronoUnit.DAYS.between(in.today(), in.horizon()) + 1;
        if (n <= 0) {
            throw new IllegalArgumentException("L'horizon de prevision precede aujourd'hui.");
        }
        BigDecimal[] dA = zeros(n);
        BigDecimal[] dS = zeros(n);
        BigDecimal[] dLate = zeros(n);
        for (Event e : in.events()) {
            int i = index(in.today(), e.date());
            if (i >= n) continue;
            dA[i] = dA[i].add(e.available());
            dS[i] = dS[i].add(e.savings());
            if (e.lateIncome()) dLate[i] = dLate[i].add(e.available());
        }
        for (Month m : in.months()) {
            spreadDiscretionary(in, m, dA, n);
            if (m.savingsToSetAside().signum() > 0 && m.setAsideDate() != null) {
                int i = index(in.today(), m.setAsideDate());
                if (i < n) {
                    dA[i] = dA[i].subtract(m.savingsToSetAside());
                    dS[i] = dS[i].add(m.savingsToSetAside());
                }
            }
        }
        BigDecimal[] a = cumulate(in.available(), dA);
        BigDecimal[] s = cumulate(in.savings(), dS);
        BigDecimal[] late = cumulate(Money.ZERO, dLate);

        // Reservations encore detenues chaque jour ; achats retenus deduits du disponible et de l'epargne.
        BigDecimal reservedTotal = in.goals().stream().map(GoalInput::reserved).reduce(Money.ZERO, BigDecimal::add);
        BigDecimal[] held = filled(n, reservedTotal);
        BigDecimal[] allocA = zeros(n);
        BigDecimal[] allocS = zeros(n);

        List<GoalResult> results = new ArrayList<>();
        for (GoalInput g : in.goals()) {
            int target = Math.min(n - 1, index(in.today(), g.targetDate()));
            Check atTarget = check(in, g, target, a, s, late, held, allocA, allocS, n);
            BigDecimal safe = g.price().multiply(SAFE_MARGIN_RATIO);
            Verdict verdict = atTarget.margin().compareTo(safe) >= 0 ? Verdict.FEASIBLE
                    : atTarget.margin().signum() >= 0 ? Verdict.RISKY : Verdict.NOT_FEASIBLE;
            boolean dependsOnLate = verdict != Verdict.NOT_FEASIBLE && atTarget.marginWithoutLate().signum() < 0;
            if (dependsOnLate) verdict = Verdict.RISKY;

            Integer feasible = null;
            for (int d = 0; d < n; d++) {
                if (check(in, g, d, a, s, late, held, allocA, allocS, n).margin().signum() >= 0) {
                    feasible = d;
                    break;
                }
            }
            Integer retained = verdict != Verdict.NOT_FEASIBLE ? Integer.valueOf(target) : feasible;
            if (retained != null) {
                BigDecimal fromSavings = check(in, g, retained, a, s, late, held, allocA, allocS, n).fromSavings();
                BigDecimal fromAvailable = g.price().subtract(fromSavings);
                for (int i = retained; i < n; i++) {
                    allocA[i] = allocA[i].add(fromAvailable);
                    allocS[i] = allocS[i].add(fromSavings);
                    held[i] = held[i].subtract(g.reserved());
                }
            }
            results.add(new GoalResult(g.id(), verdict, in.today().plusDays(target),
                    feasible == null ? null : in.today().plusDays(feasible),
                    retained == null ? null : in.today().plusDays(retained), g.price(), g.reserved(),
                    atTarget.freeAtDate(), atTarget.lowest(), atTarget.margin(), atTarget.fromSavings(),
                    atTarget.affordable(), dependsOnLate));
        }

        List<Point> points = new ArrayList<>(n);
        Point lowest = null;
        for (int i = 0; i < n; i++) {
            Point p = new Point(in.today().plusDays(i), a[i], s[i], a[i].subtract(allocA[i]));
            points.add(p);
            if (lowest == null || p.afterGoals().compareTo(lowest.afterGoals()) < 0) lowest = p;
        }
        return new Result(points, results, lowest);
    }

    /**
     * Controle d'un achat a la date d'indice d : disponible libre minimal dans la fenetre, part prise sur l'epargne
     * (au-dessus du plancher) pour un objectif finance par l'epargne, marge par rapport a la reserve.
     */
    private static Check check(Input in, GoalInput g, int d, BigDecimal[] a, BigDecimal[] s, BigDecimal[] late,
                               BigDecimal[] held, BigDecimal[] allocA, BigDecimal[] allocS, int n) {
        int end = Math.min(n - 1, d + CHECK_WINDOW_DAYS);
        BigDecimal minFree = null;
        BigDecimal minFreeWithoutLate = null;
        BigDecimal minSavings = null;
        for (int i = d; i <= end; i++) {
            // La reservation de l'objectif lui-meme reste disponible pour lui.
            BigDecimal free = a[i].subtract(allocA[i]).subtract(held[i]).add(g.reserved());
            BigDecimal freeWithoutLate = free.subtract(late[i]);
            BigDecimal savings = s[i].subtract(allocS[i]).subtract(in.savingsFloor());
            minFree = minFree == null || free.compareTo(minFree) < 0 ? free : minFree;
            minFreeWithoutLate = minFreeWithoutLate == null || freeWithoutLate.compareTo(minFreeWithoutLate) < 0
                    ? freeWithoutLate : minFreeWithoutLate;
            minSavings = minSavings == null || savings.compareTo(minSavings) < 0 ? savings : minSavings;
        }
        BigDecimal mobilizable = g.fundedBySavings() ? minSavings.max(Money.ZERO) : Money.ZERO;
        BigDecimal fromSavings = mobilizable.min(g.price());
        BigDecimal fromAvailable = g.price().subtract(fromSavings);
        BigDecimal lowest = minFree.subtract(fromAvailable);
        BigDecimal margin = lowest.subtract(in.reserve());
        BigDecimal marginWithoutLate = minFreeWithoutLate.subtract(fromAvailable).subtract(in.reserve());
        BigDecimal freeAtDate = a[d].subtract(allocA[d]).subtract(held[d]).add(g.reserved());
        BigDecimal affordable = minFree.subtract(in.reserve()).add(mobilizable).max(Money.ZERO);
        return new Check(margin, marginWithoutLate, freeAtDate, lowest, fromSavings, affordable);
    }

    /** Repartit les depenses variables a anticiper sur les jours restants du mois, au centime pres (reste au dernier jour). */
    private static void spreadDiscretionary(Input in, Month m, BigDecimal[] dA, int n) {
        if (m.discretionary().signum() <= 0) return;
        LocalDate start = m.month().atDay(1).isBefore(in.today()) ? in.today() : m.month().atDay(1);
        LocalDate end = m.month().atEndOfMonth().isAfter(in.horizon()) ? in.horizon() : m.month().atEndOfMonth();
        if (start.isAfter(end)) return;
        int days = (int) ChronoUnit.DAYS.between(start, end) + 1;
        BigDecimal perDay = m.discretionary().divide(BigDecimal.valueOf(days), 2, RoundingMode.DOWN);
        BigDecimal last = m.discretionary().subtract(perDay.multiply(BigDecimal.valueOf(days - 1)));
        int first = index(in.today(), start);
        for (int k = 0; k < days && first + k < n; k++) {
            dA[first + k] = dA[first + k].subtract(k == days - 1 ? last : perDay);
        }
    }

    private static int index(LocalDate today, LocalDate date) {
        return (int) Math.max(0, ChronoUnit.DAYS.between(today, date));
    }

    private static BigDecimal[] zeros(int n) {
        return filled(n, Money.ZERO);
    }

    private static BigDecimal[] filled(int n, BigDecimal value) {
        BigDecimal[] arr = new BigDecimal[n];
        java.util.Arrays.fill(arr, value);
        return arr;
    }

    private static BigDecimal[] cumulate(BigDecimal start, BigDecimal[] deltas) {
        BigDecimal[] out = new BigDecimal[deltas.length];
        BigDecimal running = start;
        for (int i = 0; i < deltas.length; i++) {
            running = running.add(deltas[i]);
            out[i] = running;
        }
        return out;
    }
}
