package com.focusflow.task.infrastructure;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.focusflow.task.domain.TaskExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskExecutionRepository extends JpaRepository<TaskExecution, UUID> {

    List<TaskExecution> findByTaskIdOrderByExecutionNumberAsc(UUID taskId);

    Optional<TaskExecution> findByTaskIdAndExecutionNumber(UUID taskId, int executionNumber);

    /** Tous les cycles termines dans l'intervalle [from, to[, avec tache et projet, pour les statistiques. */
    @Query("select e from TaskExecution e join fetch e.task t left join fetch t.project "
            + "where e.actualEndAt >= :from and e.actualEndAt < :to order by e.actualEndAt asc")
    List<TaskExecution> findCompletedBetween(@Param("from") Instant from, @Param("to") Instant to);

    long countByTaskIdIn(Collection<UUID> taskIds);
}
