package com.focusflow.finance;

import com.focusflow.common.ExistingIds;
import com.focusflow.finance.dto.FinanceBackupData;
import com.focusflow.finance.dto.FinanceBackupData.AccountData;
import com.focusflow.finance.dto.FinanceBackupData.AmountData;
import com.focusflow.finance.dto.FinanceBackupData.BudgetData;
import com.focusflow.finance.dto.FinanceBackupData.EnvelopeData;
import com.focusflow.finance.dto.FinanceBackupData.EnvelopeMonthData;
import com.focusflow.finance.dto.FinanceBackupData.GoalData;
import com.focusflow.finance.dto.FinanceBackupData.CategoryData;
import com.focusflow.finance.dto.FinanceBackupData.OperationData;
import com.focusflow.finance.dto.FinanceBackupData.PreferencesData;
import com.focusflow.finance.dto.FinanceBackupData.ScheduleData;
import com.focusflow.finance.dto.FinanceImportSummary;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Export et import de la section financiere de la sauvegarde. Chaque element est valide avant ecriture (memes
 * invariants que la saisie) : un element invalide est signale sans interrompre les autres. Les doublons sont
 * ignores (meme identifiant) ; une categorie de meme nom est reutilisee.
 *
 * <p>Un seul compte (lot 13) : tous les comptes d'une sauvegarde se rattachent au compte unique, cree au besoin ; le
 * solde initial d'un compte supplementaire devient une correction, les virements entre comptes sont ignores et les
 * mouvements de prets d'anciennes sauvegardes deviennent des depenses ou revenus de la categorie « Prets ».
 *
 * <p>Format v5 : montants dates des echeanciers et depenses variables plafonnees (plafonds dates, commentaires et
 * operations de total du mois). Les enveloppes sont importees apres les operations pour retrouver leurs totaux.
 */
@Component
public class FinanceBackup {

    /** Libelle d'une correction issue du solde initial d'un compte fusionne (comme la migration V8). */
    static final String MERGED_OPENING_LABEL = "Solde de départ — ";

    private final AccountRepository accounts;
    private final CategoryRepository categories;
    private final OperationRepository operations;
    private final ScheduleRepository schedules;
    private final MonthlyBudgetRepository budgets;
    private final GoalRepository goals;
    private final FinancePreferencesRepository preferences;
    private final EnvelopeRepository envelopes;
    private final EnvelopeMonthRepository envelopeMonths;
    private final FinanceDates dates;
    private final Clock clock;

    public FinanceBackup(AccountRepository accounts, CategoryRepository categories, OperationRepository operations,
                         ScheduleRepository schedules, MonthlyBudgetRepository budgets, GoalRepository goals,
                         FinancePreferencesRepository preferences, EnvelopeRepository envelopes,
                         EnvelopeMonthRepository envelopeMonths, FinanceDates dates, Clock clock) {
        this.accounts = accounts;
        this.categories = categories;
        this.operations = operations;
        this.schedules = schedules;
        this.budgets = budgets;
        this.goals = goals;
        this.preferences = preferences;
        this.envelopes = envelopes;
        this.envelopeMonths = envelopeMonths;
        this.dates = dates;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public FinanceBackupData export() {
        return new FinanceBackupData(
                accounts.findAllByOrderByArchivedAscPositionAscNameAsc().stream()
                        .map(a -> new AccountData(a.getId(), a.getName(), a.getType(), a.isArchived(), a.getPosition(),
                                a.getCreatedAt()))
                        .toList(),
                categories.findAllOrdered().stream()
                        .sorted(Comparator.comparing((Category c) -> c.getParent() != null))
                        .map(c -> new CategoryData(c.getId(), c.getParent() == null ? null : c.getParent().getId(),
                                c.getName(), c.getIcon(), c.getColor(), c.getPosition(), c.isArchived(), c.getCreatedAt()))
                        .toList(),
                schedules.findAllOrdered().stream()
                        .map(s -> new ScheduleData(s.getId(), s.getLabel(), s.getType(), s.getKind(), s.getAccount().getId(),
                                s.getCategory() == null ? null : s.getCategory().getId(), s.getIncomeKind(), s.getAmount(),
                                s.isEssential(), s.getFrequency(), s.getIntervalCount(), s.getStartDate(), s.getEndDate(),
                                s.getStatus(), s.getNotes(), s.getCreatedAt(), s.getUpdatedAt(),
                                s.getAmountVersions().entrySet().stream()
                                        .map(v -> new AmountData(YearMonth.from(v.getKey()), v.getValue())).toList()))
                        .toList(),
                goals.findAllOrdered().stream()
                        .map(g -> new GoalData(g.getId(), g.getName(), g.getCategory() == null ? null : g.getCategory().getId(),
                                g.getDescription(), g.getEstimatedPrice(), g.getMaxPrice(), g.getTargetDate(), g.isImportant(),
                                g.isUrgent(), g.getStatus(), g.getReservedAmount(), g.isFundedBySavings(), g.getPosition(),
                                g.getNotes(), g.getCreatedAt(), g.getUpdatedAt()))
                        .toList(),
                operations.findAllForBackup().stream()
                        .map(o -> new OperationData(o.getId(), o.getAccount().getId(),
                                o.getTargetAccount() == null ? null : o.getTargetAccount().getId(), o.getType().name(),
                                o.getStatus(), o.getDirection(), o.getDate(), o.getAmount(), o.getPlannedAmount(),
                                o.getCategory() == null ? null : o.getCategory().getId(), o.getIncomeKind(), o.getLabel(),
                                o.getDescription(), o.isEssential(), o.isExceptional(),
                                o.getRefundOf() == null ? null : o.getRefundOf().getId(), o.getCreatedAt(), o.getUpdatedAt(),
                                o.getSchedule() == null ? null : o.getSchedule().getId(), o.getDueDate(),
                                o.getGoal() == null ? null : o.getGoal().getId()))
                        .toList(),
                budgets.findAllByOrderByMonthAsc().stream()
                        .map(b -> new BudgetData(b.getMonth(), b.getVariableCap(), b.getSavingsTarget()))
                        .toList(),
                preferences.findById(FinancePreferences.SINGLETON_ID)
                        .map(p -> new PreferencesData(p.getSafetyReserve(), p.getSavingsFloor(), p.getDefaultVariableCap(),
                                p.getDefaultSavingsTarget(), p.getWarningPercent()))
                        .orElse(null),
                exportEnvelopes());
    }

    private List<EnvelopeData> exportEnvelopes() {
        Map<UUID, List<EnvelopeMonthData>> monthsByEnvelope = new HashMap<>();
        for (EnvelopeMonth m : envelopeMonths.findAllByOrderByMonthAsc()) {
            monthsByEnvelope.computeIfAbsent(m.getEnvelopeId(), k -> new ArrayList<>())
                    .add(new EnvelopeMonthData(m.getMonth(), m.getComment(), m.getTotalOperationId()));
        }
        return envelopes.findAllOrdered().stream()
                .map(e -> new EnvelopeData(e.getId(), e.getCategory().getId(), e.getLabel(), e.getPosition(),
                        e.getStartMonth(), e.getEndMonth(),
                        e.amountTimeline().entrySet().stream().map(v -> new AmountData(v.getKey(), v.getValue())).toList(),
                        monthsByEnvelope.getOrDefault(e.getId(), List.of()), e.getCreatedAt(), e.getUpdatedAt()))
                .toList();
    }

    /** Doit etre appele dans la transaction de l'import global. */
    @Transactional
    public FinanceImportSummary importData(FinanceBackupData data, Consumer<String> errors) {
        Instant now = Instant.now(clock);
        int[] counts = new int[11];
        Map<UUID, Account> accountMap = importAccounts(nullToEmpty(data.accounts()), now, counts, errors);
        Map<UUID, Category> categoryMap = importCategories(nullToEmpty(data.categories()), now, counts, errors);
        Map<UUID, Schedule> scheduleMap = importSchedules(nullToEmpty(data.schedules()), accountMap, categoryMap, now,
                counts, errors);
        Map<UUID, Goal> goalMap = importGoals(nullToEmpty(data.goals()), categoryMap, now, counts, errors);
        Map<UUID, String> accountNames = new HashMap<>();
        nullToEmpty(data.accounts()).forEach(a -> {
            if (a.id() != null && a.name() != null && !a.name().isBlank()) accountNames.put(a.id(), a.name().strip());
        });
        importOperations(nullToEmpty(data.operations()), accountMap, accountNames, categoryMap, scheduleMap, goalMap,
                now, counts, errors);
        importEnvelopes(nullToEmpty(data.envelopes()), categoryMap, now, errors);
        importBudgets(nullToEmpty(data.budgets()), counts, errors);
        boolean preferencesRestored = data.preferences() != null && importPreferences(data.preferences(), errors);
        return new FinanceImportSummary(counts[0], counts[1], counts[2], counts[3], counts[4], counts[5], counts[6],
                counts[7], counts[8], preferencesRestored, counts[9], counts[10]);
    }

    /**
     * Rattache chaque compte de la sauvegarde au compte unique. Sans compte en base, il est cree d'apres le compte
     * courant actif de la sauvegarde (ou son premier compte).
     */
    private Map<UUID, Account> importAccounts(List<AccountData> list, Instant now, int[] counts, Consumer<String> errors) {
        Map<UUID, Account> map = new HashMap<>();
        Account single = accounts.findAll().stream()
                .min(Comparator.comparing(Account::isArchived).thenComparing(Account::getCreatedAt)).orElse(null);
        List<AccountData> ordered = new ArrayList<>(list);
        ordered.sort(Comparator.comparing((AccountData d) -> Boolean.TRUE.equals(d.archived()))
                .thenComparing(d -> d.type() != AccountType.CURRENT));
        for (AccountData d : ordered) {
            try {
                if (single == null) {
                    String name = d.name() == null ? "" : d.name().strip();
                    if (name.isEmpty() || name.length() > 80) {
                        throw new IllegalArgumentException("nom obligatoire (80 caracteres maximum).");
                    }
                    single = accounts.save(Account.restored(d.id(), name, AccountType.CURRENT, false, 0,
                            d.createdAt() != null ? d.createdAt() : now));
                    counts[0]++;
                } else {
                    counts[1]++;
                }
                if (d.id() != null) map.put(d.id(), single);
            } catch (RuntimeException e) {
                errors.accept("Compte '" + d.name() + "' : " + e.getMessage());
            }
        }
        return map;
    }

    private Map<UUID, Category> importCategories(List<CategoryData> list, Instant now, int[] counts, Consumer<String> errors) {
        Map<UUID, Category> map = new HashMap<>();
        // Les racines d'abord, pour que les sous-categories trouvent leur parent.
        List<CategoryData> ordered = new ArrayList<>(list);
        ordered.sort(Comparator.comparing((CategoryData c) -> c.parentId() != null));
        for (CategoryData d : ordered) {
            try {
                String name = d.name() == null ? "" : d.name().strip();
                if (name.isEmpty() || name.length() > 60) {
                    throw new IllegalArgumentException("nom obligatoire (60 caracteres maximum).");
                }
                Category parent = null;
                if (d.parentId() != null) {
                    parent = map.containsKey(d.parentId()) ? map.get(d.parentId())
                            : categories.findById(d.parentId()).orElseThrow(
                                    () -> new IllegalArgumentException("categorie parente introuvable."));
                    if (parent.getParent() != null) {
                        throw new IllegalArgumentException("les categories ont deux niveaux au plus.");
                    }
                }
                Category existing = d.id() == null ? null : categories.findById(d.id()).orElse(null);
                boolean archived = Boolean.TRUE.equals(d.archived());
                if (existing == null && !archived) {
                    UUID parentId = parent == null ? null : parent.getId();
                    existing = categories.findAllOrdered().stream()
                            .filter(c -> !c.isArchived() && c.getName().equalsIgnoreCase(name)
                                    && (parentId == null ? c.getParent() == null
                                    : c.getParent() != null && c.getParent().getId().equals(parentId)))
                            .findFirst().orElse(null);
                }
                if (existing != null) {
                    if (d.id() != null) map.put(d.id(), existing);
                    counts[3]++;
                    continue;
                }
                Category c = categories.save(Category.restored(d.id(), parent, name, d.icon(), d.color(),
                        d.position() == null ? 0 : d.position(), archived, d.createdAt() != null ? d.createdAt() : now));
                if (d.id() != null) map.put(d.id(), c);
                counts[2]++;
            } catch (RuntimeException e) {
                errors.accept("Categorie '" + d.name() + "' : " + e.getMessage());
            }
        }
        return map;
    }

    private Map<UUID, Schedule> importSchedules(List<ScheduleData> list, Map<UUID, Account> accountMap,
                                                Map<UUID, Category> categoryMap, Instant now, int[] counts,
                                                Consumer<String> errors) {
        Map<UUID, Schedule> map = new HashMap<>();
        for (ScheduleData d : list) {
            try {
                if (d.id() != null) {
                    Schedule existing = schedules.findById(d.id()).orElse(null);
                    if (existing != null) {
                        map.put(d.id(), existing);
                        counts[7]++;
                        continue;
                    }
                }
                Account account = resolveAccount(d.accountId(), accountMap);
                Category category = d.categoryId() == null ? null
                        : categoryMap.containsKey(d.categoryId()) ? categoryMap.get(d.categoryId())
                        : categories.findById(d.categoryId()).orElseThrow(() -> new IllegalArgumentException("categorie introuvable."));
                Schedule s = schedules.save(Schedule.restored(d.id(), new Schedule.Draft(d.label(), d.type(), d.kind(),
                                account, category, d.incomeKind(), d.amount(), Boolean.TRUE.equals(d.essential()),
                                d.frequency(), d.intervalCount() == null ? 1 : d.intervalCount(), d.startDate(), null,
                                d.notes()), d.status(), d.createdAt() != null ? d.createdAt() : now, d.updatedAt()));
                // La date de fin est restauree telle quelle (y compris une resiliation avant la premiere echeance).
                s.restoreEndDate(d.endDate());
                for (AmountData v : nullToEmpty(d.amounts())) {
                    try {
                        s.restoreAmount(v.fromMonth(), v.amount());
                    } catch (RuntimeException e) {
                        errors.accept("Echeancier '" + d.label() + "', montant de " + v.fromMonth() + " ignore : "
                                + e.getMessage());
                    }
                }
                if (d.id() != null) map.put(d.id(), s);
                counts[6]++;
            } catch (RuntimeException e) {
                errors.accept("Echeancier '" + d.label() + "' : " + e.getMessage());
            }
        }
        return map;
    }

    private Map<UUID, Goal> importGoals(List<GoalData> list, Map<UUID, Category> categoryMap, Instant now, int[] counts,
                                        Consumer<String> errors) {
        Map<UUID, Goal> map = new HashMap<>();
        for (GoalData d : list) {
            try {
                if (d.id() != null) {
                    Goal existing = goals.findById(d.id()).orElse(null);
                    if (existing != null) {
                        map.put(d.id(), existing);
                        counts[10]++;
                        continue;
                    }
                }
                Category category = d.categoryId() == null ? null
                        : categoryMap.containsKey(d.categoryId()) ? categoryMap.get(d.categoryId())
                        : categories.findById(d.categoryId()).orElse(null);
                GoalStatus status = d.status() == null ? GoalStatus.PLANNED : d.status();
                // Un objectif clos est recree ouvert puis clos, pour passer par les memes regles que la saisie.
                Goal g = Goal.restored(d.id(), new Goal.Draft(d.name(), category, d.description(), d.estimatedPrice(),
                                d.maxPrice(), d.targetDate(), Boolean.TRUE.equals(d.important()),
                                Boolean.TRUE.equals(d.urgent()), status.isOpen() ? status : GoalStatus.PLANNED,
                                Boolean.TRUE.equals(d.fundedBySavings()), d.notes()),
                        status.isOpen() ? d.reservedAmount() : null, d.position() == null ? 0 : d.position(),
                        d.createdAt() != null ? d.createdAt() : now, d.updatedAt());
                if (status == GoalStatus.PURCHASED) g.markPurchased(g.getUpdatedAt());
                if (status == GoalStatus.ABANDONED) g.abandon(g.getUpdatedAt());
                g = goals.save(g);
                if (d.id() != null) map.put(d.id(), g);
                counts[9]++;
            } catch (RuntimeException e) {
                errors.accept("Objectif '" + d.name() + "' : " + e.getMessage());
            }
        }
        return map;
    }

    private void importBudgets(List<BudgetData> list, int[] counts, Consumer<String> errors) {
        for (BudgetData d : list) {
            try {
                if (d.month() == null) {
                    throw new IllegalArgumentException("mois manquant.");
                }
                MonthlyBudget b = budgets.findByMonth(d.month().withDayOfMonth(1))
                        .orElseGet(() -> new MonthlyBudget(d.month()));
                b.setVariableCap(d.variableCap() == null ? null : nonNegative(d.variableCap()));
                b.setSavingsTarget(d.savingsTarget() == null ? null : nonNegative(d.savingsTarget()));
                budgets.save(b);
                counts[8]++;
            } catch (RuntimeException e) {
                errors.accept("Budget de " + d.month() + " : " + e.getMessage());
            }
        }
    }

    private boolean importPreferences(PreferencesData d, Consumer<String> errors) {
        try {
            int warning = d.warningPercent() == null ? 80 : d.warningPercent();
            if (warning < 1 || warning > 100) {
                throw new IllegalArgumentException("seuil d'alerte hors de 1 a 100.");
            }
            BigDecimal reserve = d.safetyReserve() == null ? Money.ZERO : nonNegative(d.safetyReserve());
            BigDecimal floor = d.savingsFloor() == null ? Money.ZERO : nonNegative(d.savingsFloor());
            BigDecimal cap = d.defaultVariableCap() == null ? null : nonNegative(d.defaultVariableCap());
            BigDecimal target = d.defaultSavingsTarget() == null ? null : nonNegative(d.defaultSavingsTarget());
            FinancePreferences p = preferences.findById(FinancePreferences.SINGLETON_ID).orElseGet(FinancePreferences::new);
            p.setSafetyReserve(reserve);
            p.setSavingsFloor(floor);
            p.setDefaultVariableCap(cap);
            p.setDefaultSavingsTarget(target);
            p.setWarningPercent(warning);
            preferences.save(p);
            return true;
        } catch (RuntimeException e) {
            errors.accept("Preferences financieres non restaurees : " + e.getMessage());
            return false;
        }
    }

    private static BigDecimal nonNegative(BigDecimal value) {
        BigDecimal v = Money.cents(value, "Le montant");
        if (v.signum() < 0) {
            throw new IllegalArgumentException("montant negatif.");
        }
        return v;
    }

    private void importOperations(List<OperationData> list, Map<UUID, Account> accountMap, Map<UUID, String> accountNames,
                                  Map<UUID, Category> categoryMap, Map<UUID, Schedule> scheduleMap,
                                  Map<UUID, Goal> goalMap, Instant now, int[] counts, Consumer<String> errors) {
        Category[] loansCategory = {null};
        Map<UUID, Operation> imported = new HashMap<>();
        Set<UUID> seen = new HashSet<>();
        // Identifiants deja en base, lus d'avance par lots (voir ExistingIds).
        Set<UUID> existing = ExistingIds.among(list.stream().map(OperationData::id).toList(), operations::findExistingIds);
        // Les remboursements apres les depenses qu'ils remboursent.
        List<OperationData> ordered = new ArrayList<>(list);
        ordered.sort(Comparator.comparing((OperationData o) -> o.refundOfId() != null));
        for (OperationData d : ordered) {
            try {
                if (d.id() != null && (!seen.add(d.id()) || existing.contains(d.id()))) {
                    counts[5]++;
                    continue;
                }
                if ("TRANSFER".equals(d.type())) {
                    // Virement entre deux comptes devenus un seul : sans effet sur le solde total.
                    counts[5]++;
                    continue;
                }
                Account account = resolveAccount(d.accountId(), accountMap);
                Category category = d.categoryId() == null ? null
                        : categoryMap.containsKey(d.categoryId()) ? categoryMap.get(d.categoryId())
                        : categories.findById(d.categoryId()).orElseThrow(() -> new IllegalArgumentException("categorie introuvable."));
                OperationType type;
                IncomeKind incomeKind = d.incomeKind();
                switch (d.type() == null ? "" : d.type()) {
                    case "LOAN_GIVEN", "LOAN_REPAID" -> {
                        type = OperationType.EXPENSE;
                        category = loansCategory(loansCategory, now);
                        incomeKind = null;
                    }
                    case "LOAN_COLLECTED", "LOAN_TAKEN" -> {
                        type = OperationType.INCOME;
                        category = loansCategory(loansCategory, now);
                        incomeKind = IncomeKind.OTHER;
                    }
                    default -> {
                        try {
                            type = OperationType.valueOf(d.type());
                        } catch (IllegalArgumentException e) {
                            throw new IllegalArgumentException("type d'operation inconnu : " + d.type() + ".");
                        }
                    }
                }
                String label = d.label();
                if (type == OperationType.OPENING_BALANCE
                        && operations.existsByAccountIdAndType(account.getId(), OperationType.OPENING_BALANCE)) {
                    // Solde initial d'un compte fusionne : il s'ajoute au compte unique comme correction, nommee
                    // d'apres le compte de la sauvegarde (comme la migration V8).
                    type = OperationType.ADJUSTMENT;
                    String accountName = accountNames.get(d.accountId());
                    if (accountName != null) {
                        label = MERGED_OPENING_LABEL + accountName;
                        if (label.length() > 120) label = label.substring(0, 120);
                    }
                }
                Operation refundOf = d.refundOfId() == null ? null
                        : imported.containsKey(d.refundOfId()) ? imported.get(d.refundOfId())
                        : operations.findById(d.refundOfId()).orElse(null);
                if (d.status() == OperationStatus.COMPLETED && d.date() != null && d.date().isAfter(dates.today())) {
                    throw new IllegalArgumentException("operation realisee datee dans le futur.");
                }
                Schedule schedule = d.scheduleId() == null ? null
                        : scheduleMap.containsKey(d.scheduleId()) ? scheduleMap.get(d.scheduleId())
                        : schedules.findById(d.scheduleId()).orElseThrow(() -> new IllegalArgumentException("echeancier introuvable."));
                if (schedule != null && (d.dueDate() == null
                        || operations.findByScheduleIdAndDueDate(schedule.getId(), d.dueDate()).isPresent())) {
                    throw new IllegalArgumentException("echeance absente ou deja enregistree.");
                }
                Operation o = Operation.restored(d.id(), new Operation.Draft(account, null, type, d.status(),
                                d.direction(), d.date(), d.amount(), category, incomeKind, label, d.description(),
                                Boolean.TRUE.equals(d.essential()), Boolean.TRUE.equals(d.exceptional()), refundOf),
                        d.plannedAmount(), d.createdAt() != null ? d.createdAt() : now, d.updatedAt());
                if (schedule != null) {
                    o.linkOccurrence(schedule, d.dueDate());
                }
                if (d.goalId() != null) {
                    Goal goal = goalMap.containsKey(d.goalId()) ? goalMap.get(d.goalId()) : goals.findById(d.goalId()).orElse(null);
                    if (goal != null) o.linkGoal(goal);
                }
                Operation saved = operations.save(o);
                if (d.id() != null) imported.put(d.id(), saved);
                counts[4]++;
            } catch (RuntimeException e) {
                errors.accept("Operation '" + d.label() + "' du " + d.date() + " : " + e.getMessage());
            }
        }
    }

    /**
     * Depenses variables plafonnees, apres les operations : une enveloppe deja presente (meme identifiant) est ignoree,
     * une categorie deja suivie est signalee. Le suivi mensuel ne reprend une operation de total que si elle existe.
     */
    private void importEnvelopes(List<EnvelopeData> list, Map<UUID, Category> categoryMap, Instant now,
                                 Consumer<String> errors) {
        Set<UUID> usedTotals = new HashSet<>();
        for (EnvelopeData d : list) {
            try {
                if (d.id() != null && envelopes.existsById(d.id())) {
                    continue;
                }
                Category category = d.categoryId() == null ? null
                        : categoryMap.containsKey(d.categoryId()) ? categoryMap.get(d.categoryId())
                        : categories.findById(d.categoryId()).orElse(null);
                if (category == null) {
                    throw new IllegalArgumentException("categorie introuvable.");
                }
                if (envelopes.existsByCategoryId(category.getId())) {
                    throw new IllegalArgumentException("la categorie « " + category.getName()
                            + " » a deja une depense variable plafonnee.");
                }
                Map<YearMonth, BigDecimal> caps = new HashMap<>();
                for (AmountData v : nullToEmpty(d.amounts())) {
                    if (v.fromMonth() != null) caps.put(v.fromMonth(), v.amount());
                }
                Envelope e = envelopes.save(Envelope.restored(d.id(), category, d.label(),
                        d.position() == null ? 0 : d.position(), d.startMonth(), d.endMonth(), caps,
                        d.createdAt() != null ? d.createdAt() : now, d.updatedAt()));
                for (EnvelopeMonthData m : nullToEmpty(d.months())) {
                    if (m.month() == null) continue;
                    UUID total = m.totalOperationId();
                    if (total != null && (!usedTotals.add(total) || !operations.existsById(total)
                            || envelopeMonths.existsByTotalOperationId(total))) {
                        total = null;
                    }
                    EnvelopeMonth tracking = new EnvelopeMonth(e.getId(), m.month());
                    tracking.setComment(m.comment());
                    tracking.setTotalOperationId(total);
                    if (!tracking.isEmpty()) envelopeMonths.save(tracking);
                }
            } catch (RuntimeException ex) {
                errors.accept("Depense variable '" + d.label() + "' : " + ex.getMessage());
            }
        }
    }

    /** Categorie racine « Prets », reutilisee ou creee une fois pour les mouvements de prets d'anciennes sauvegardes. */
    private Category loansCategory(Category[] cache, Instant now) {
        if (cache[0] == null) {
            List<Category> all = categories.findAll();
            cache[0] = all.stream()
                    .filter(c -> c.getParent() == null && !c.isArchived()
                            && (c.getName().equalsIgnoreCase("Prêts") || c.getName().equalsIgnoreCase("Prets")))
                    .findFirst()
                    .orElseGet(() -> categories.save(Category.restored(null, null, "Prêts", "hand-coins", "#0d9488",
                            (int) all.stream().filter(c -> c.getParent() == null).count(), false, now)));
        }
        return cache[0];
    }

    /** Compte unique : celui de la sauvegarde s'il est connu, sinon le compte deja en base. */
    private Account resolveAccount(UUID id, Map<UUID, Account> accountMap) {
        if (id != null && accountMap.containsKey(id)) {
            return accountMap.get(id);
        }
        return accounts.findAll().stream()
                .min(Comparator.comparing(Account::isArchived).thenComparing(Account::getCreatedAt))
                .orElseThrow(() -> new IllegalArgumentException("aucun compte : saisissez d'abord votre solde."));
    }

    private static <T> List<T> nullToEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }
}
