package com.focusflow.finance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface OperationRepository extends JpaRepository<Operation, UUID>, JpaSpecificationExecutor<Operation> {

    @Override
    @EntityGraph(attributePaths = {"account", "targetAccount", "category", "category.parent"})
    Page<Operation> findAll(Specification<Operation> spec, Pageable pageable);

    /** Effet net des operations realisees sur leur compte : credits moins debits. */
    @Query("select o.account.id, sum(case when o.direction = com.focusflow.finance.Direction.CREDIT then o.amount "
            + "else -o.amount end) from Operation o where o.status = com.focusflow.finance.OperationStatus.COMPLETED "
            + "group by o.account.id")
    List<Object[]> completedNetByAccount();

    /** Virements realises recus par chaque compte cible. */
    @Query("select o.targetAccount.id, sum(o.amount) from Operation o "
            + "where o.type = com.focusflow.finance.OperationType.TRANSFER "
            + "and o.status = com.focusflow.finance.OperationStatus.COMPLETED group by o.targetAccount.id")
    List<Object[]> completedTransfersInByAccount();

    @EntityGraph(attributePaths = {"account", "targetAccount", "category", "category.parent", "refundOf"})
    @Query("select o from Operation o where o.date between :from and :to order by o.date asc, o.createdAt asc")
    List<Operation> findBetween(LocalDate from, LocalDate to);

    @EntityGraph(attributePaths = {"account", "targetAccount", "category", "category.parent"})
    @Query("select o from Operation o where o.status = com.focusflow.finance.OperationStatus.PLANNED "
            + "and o.date <= :until order by o.date asc, o.createdAt asc")
    List<Operation> findPlannedUntil(LocalDate until);

    @EntityGraph(attributePaths = {"account", "category", "category.parent"})
    @Query("select o from Operation o where o.account.id = :accountId and o.type = :type and o.amount = :amount "
            + "and o.date between :from and :to and o.status <> com.focusflow.finance.OperationStatus.CANCELLED "
            + "and (:excludeId is null or o.id <> :excludeId) order by o.date desc")
    List<Operation> findPossibleDuplicates(UUID accountId, OperationType type, BigDecimal amount, LocalDate from,
                                           LocalDate to, UUID excludeId);

    @Query("select o.category.id, count(o) from Operation o where o.category is not null group by o.category.id")
    List<Object[]> countByCategory();

    boolean existsByCategoryIdIn(Collection<UUID> categoryIds);

    @Query("select count(o) > 0 from Operation o where o.account.id = :accountId or o.targetAccount.id = :accountId")
    boolean existsForAccount(UUID accountId);

    boolean existsByAccountIdAndType(UUID accountId, OperationType type);

    @EntityGraph(attributePaths = {"account", "targetAccount", "category", "category.parent", "refundOf"})
    @Query("select o from Operation o order by o.date asc, o.createdAt asc")
    List<Operation> findAllForBackup();
}
