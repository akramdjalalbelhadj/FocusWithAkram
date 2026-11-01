package com.focusflow.finance;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GoalRepository extends JpaRepository<Goal, UUID> {

    @EntityGraph(attributePaths = {"category", "category.parent"})
    @Query("select g from Goal g order by g.targetDate asc, g.createdAt asc")
    List<Goal> findAllOrdered();
}
