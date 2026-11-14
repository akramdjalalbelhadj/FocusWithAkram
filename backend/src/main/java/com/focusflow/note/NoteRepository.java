package com.focusflow.note;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoteRepository extends JpaRepository<Note, UUID>, JpaSpecificationExecutor<Note> {

    /** Parmi ces identifiants, ceux deja en base (import par lots, voir ExistingIds). */
    @Query("select n.id from Note n where n.id in :ids")
    List<UUID> findExistingIds(@Param("ids") Collection<UUID> ids);

    /** Verrouille l'idee le temps d'en creer une tache : deux envois simultanes ne creent pas deux taches. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from Note n where n.id = :id")
    Optional<Note> findForUpdate(@Param("id") UUID id);

    /** Idees supprimees dont le delai de reflexion est ecoule. */
    List<Note> findAllByPurgeAtLessThanEqual(Instant now);

    @Query("select distinct t from Note n join n.tags t")
    List<String> findAllTagNames();

    /** Lignes [categorie, nombre d'idees]. */
    @Query("select n.category.id, count(n) from Note n where n.category is not null group by n.category.id")
    List<Object[]> countByCategory();

    @Query("select n.id from Note n where lower(n.title) = lower(:title) and n.createdAt = :createdAt")
    List<UUID> findIdsByTitleAndCreatedAt(@Param("title") String title, @Param("createdAt") Instant createdAt);
}
