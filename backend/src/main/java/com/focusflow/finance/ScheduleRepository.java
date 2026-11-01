package com.focusflow.finance;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {

    @EntityGraph(attributePaths = {"account", "category", "category.parent"})
    @Query("select s from Schedule s order by s.status asc, s.type desc, lower(s.label) asc")
    List<Schedule> findAllOrdered();
}
