package com.focusflow.finance;

import com.focusflow.finance.dto.FinanceBackupData;
import com.focusflow.finance.dto.FinanceBackupData.AccountData;
import com.focusflow.finance.dto.FinanceBackupData.CategoryData;
import com.focusflow.finance.dto.FinanceBackupData.OperationData;
import com.focusflow.finance.dto.FinanceImportSummary;
import java.time.Clock;
import java.time.Instant;
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
 * ignores (meme identifiant) ; un compte ou une categorie de meme nom est reutilise.
 */
@Component
public class FinanceBackup {

    private final AccountRepository accounts;
    private final CategoryRepository categories;
    private final OperationRepository operations;
    private final FinanceDates dates;
    private final Clock clock;

    public FinanceBackup(AccountRepository accounts, CategoryRepository categories, OperationRepository operations,
                         FinanceDates dates, Clock clock) {
        this.accounts = accounts;
        this.categories = categories;
        this.operations = operations;
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
                operations.findAllForBackup().stream()
                        .map(o -> new OperationData(o.getId(), o.getAccount().getId(),
                                o.getTargetAccount() == null ? null : o.getTargetAccount().getId(), o.getType(),
                                o.getStatus(), o.getDirection(), o.getDate(), o.getAmount(), o.getPlannedAmount(),
                                o.getCategory() == null ? null : o.getCategory().getId(), o.getIncomeKind(), o.getLabel(),
                                o.getDescription(), o.isEssential(), o.isExceptional(),
                                o.getRefundOf() == null ? null : o.getRefundOf().getId(), o.getCreatedAt(), o.getUpdatedAt()))
                        .toList());
    }

    /** Doit etre appele dans la transaction de l'import global. */
    @Transactional
    public FinanceImportSummary importData(FinanceBackupData data, Consumer<String> errors) {
        Instant now = Instant.now(clock);
        int[] counts = new int[6];
        Map<UUID, Account> accountMap = importAccounts(nullToEmpty(data.accounts()), now, counts, errors);
        Map<UUID, Category> categoryMap = importCategories(nullToEmpty(data.categories()), now, counts, errors);
        importOperations(nullToEmpty(data.operations()), accountMap, categoryMap, now, counts, errors);
        return new FinanceImportSummary(counts[0], counts[1], counts[2], counts[3], counts[4], counts[5]);
    }

    private Map<UUID, Account> importAccounts(List<AccountData> list, Instant now, int[] counts, Consumer<String> errors) {
        Map<UUID, Account> map = new HashMap<>();
        for (AccountData d : list) {
            try {
                String name = d.name() == null ? "" : d.name().strip();
                if (name.isEmpty() || name.length() > 80 || d.type() == null) {
                    throw new IllegalArgumentException("nom (80 caracteres maximum) et type obligatoires.");
                }
                Account existing = d.id() == null ? null : accounts.findById(d.id()).orElse(null);
                boolean archived = Boolean.TRUE.equals(d.archived());
                if (existing == null && !archived) {
                    existing = accounts.findAll().stream()
                            .filter(a -> !a.isArchived() && a.getName().equalsIgnoreCase(name)).findFirst().orElse(null);
                }
                if (existing != null) {
                    if (d.id() != null) map.put(d.id(), existing);
                    counts[1]++;
                    continue;
                }
                Account a = accounts.save(Account.restored(d.id(), name, d.type(), archived,
                        d.position() == null ? 0 : d.position(), d.createdAt() != null ? d.createdAt() : now));
                if (d.id() != null) map.put(d.id(), a);
                counts[0]++;
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

    private void importOperations(List<OperationData> list, Map<UUID, Account> accountMap, Map<UUID, Category> categoryMap,
                                  Instant now, int[] counts, Consumer<String> errors) {
        Map<UUID, Operation> imported = new HashMap<>();
        Set<UUID> seen = new HashSet<>();
        // Les remboursements apres les depenses qu'ils remboursent.
        List<OperationData> ordered = new ArrayList<>(list);
        ordered.sort(Comparator.comparing((OperationData o) -> o.refundOfId() != null));
        for (OperationData d : ordered) {
            try {
                if (d.id() != null && (!seen.add(d.id()) || operations.existsById(d.id()))) {
                    counts[5]++;
                    continue;
                }
                Account account = resolveAccount(d.accountId(), accountMap);
                Account target = d.targetAccountId() == null ? null : resolveAccount(d.targetAccountId(), accountMap);
                Category category = d.categoryId() == null ? null
                        : categoryMap.containsKey(d.categoryId()) ? categoryMap.get(d.categoryId())
                        : categories.findById(d.categoryId()).orElseThrow(() -> new IllegalArgumentException("categorie introuvable."));
                Operation refundOf = d.refundOfId() == null ? null
                        : imported.containsKey(d.refundOfId()) ? imported.get(d.refundOfId())
                        : operations.findById(d.refundOfId()).orElse(null);
                if (d.status() == OperationStatus.COMPLETED && d.date() != null && d.date().isAfter(dates.today())) {
                    throw new IllegalArgumentException("operation realisee datee dans le futur.");
                }
                if (d.type() == OperationType.OPENING_BALANCE
                        && operations.existsByAccountIdAndType(account.getId(), OperationType.OPENING_BALANCE)) {
                    throw new IllegalArgumentException("le compte '" + account.getName() + "' a deja un solde initial.");
                }
                Operation o = Operation.restored(d.id(), new Operation.Draft(account, target, d.type(), d.status(),
                                d.direction(), d.date(), d.amount(), category, d.incomeKind(), d.label(), d.description(),
                                Boolean.TRUE.equals(d.essential()), Boolean.TRUE.equals(d.exceptional()), refundOf),
                        d.plannedAmount(), d.createdAt() != null ? d.createdAt() : now, d.updatedAt());
                Operation saved = operations.save(o);
                if (d.id() != null) imported.put(d.id(), saved);
                counts[4]++;
            } catch (RuntimeException e) {
                errors.accept("Operation '" + d.label() + "' du " + d.date() + " : " + e.getMessage());
            }
        }
    }

    private Account resolveAccount(UUID id, Map<UUID, Account> accountMap) {
        if (id == null) {
            throw new IllegalArgumentException("compte manquant.");
        }
        if (accountMap.containsKey(id)) {
            return accountMap.get(id);
        }
        return accounts.findById(id).orElseThrow(() -> new IllegalArgumentException("compte introuvable."));
    }

    private static <T> List<T> nullToEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }
}
