package com.focusflow.task.infrastructure;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.focusflow.task.domain.DailyGoal;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyGoalRepository extends JpaRepository<DailyGoal, UUID> {

    @EntityGraph(attributePaths = {"task", "task.project"})
    List<DailyGoal> findByGoalDateOrderByPositionAsc(LocalDate goalDate);

    void deleteByGoalDate(LocalDate goalDate);
}
