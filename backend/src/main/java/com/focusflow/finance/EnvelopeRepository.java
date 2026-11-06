package com.focusflow.finance;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EnvelopeRepository extends JpaRepository<Envelope, UUID> {

    @EntityGraph(attributePaths = {"category", "category.parent", "amounts"})
    @Query("select e from Envelope e order by e.position asc, lower(e.label) asc")
    List<Envelope> findAllOrdered();

    boolean existsByCategoryId(UUID categoryId);
}
