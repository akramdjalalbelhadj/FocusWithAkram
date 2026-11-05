package com.focusflow.task;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {

    /** Parmi ces identifiants, ceux deja en base (import par lots, voir ExistingIds). */
    @Query("select t.id from Task t where t.id in :ids")
    List<UUID> findExistingIds(@Param("ids") Collection<UUID> ids);

    /** Taches actives (ni terminees ni archivees) : base de la matrice, des priorites et du calendrier. */
    @Query("select t from Task t left join fetch t.project where t.archivedAt is null")
    List<Task> findAllActive();

    @Query("select coalesce(max(t.position), -1) from Task t "
            + "where t.archivedAt is null and t.important = :important and t.urgent = :urgent")
    int maxPosition(@Param("important") boolean important, @Param("urgent") boolean urgent);

    @Query("select t from Task t left join fetch t.project where t.id in :ids")
    List<Task> findAllWithProjectByIdIn(@Param("ids") Collection<UUID> ids);

    List<Task> findTop10ByTitleContainingIgnoreCaseOrderByUpdatedAtDesc(String title);

    @Query("select t.actualEndAt from Task t where t.archivedAt is not null and t.actualEndAt is not null")
    List<Instant> findAllArchivedEndTimes();

    @Query("select t.status, count(t) from Task t group by t.status")
    List<Object[]> countByStatus();

    boolean existsByTitleIgnoreCaseAndCreatedAt(String title, Instant createdAt);

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(Instant from, Instant to);

    @Query("select t from Task t where t.createdAt >= :from and t.createdAt < :to")
    List<Task> findCreatedBetween(@Param("from") Instant from, @Param("to") Instant to);

    // ---- Idee d'origine (module Notes & idees) ------------------------------------------------

    @Query("select t from Task t left join fetch t.project where t.sourceNoteId = :noteId order by t.createdAt, t.id")
    List<Task> findAllBySourceNoteId(@Param("noteId") UUID noteId);

    long countBySourceNoteId(UUID noteId);

    boolean existsBySourceNoteIdAndTitleIgnoreCase(UUID noteId, String title);

    /** Lignes [idee, nombre de taches, nombre de taches terminees] pour les idees demandees. */
    @Query("select t.sourceNoteId, count(t), sum(case when t.status = com.focusflow.task.TaskStatus.DONE then 1 else 0 end) "
            + "from Task t where t.sourceNoteId in :noteIds group by t.sourceNoteId")
    List<Object[]> progressBySourceNoteIds(@Param("noteIds") Collection<UUID> noteIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Task t set t.sourceNoteId = null where t.sourceNoteId = :noteId")
    int detachFromSourceNote(@Param("noteId") UUID noteId);
}
