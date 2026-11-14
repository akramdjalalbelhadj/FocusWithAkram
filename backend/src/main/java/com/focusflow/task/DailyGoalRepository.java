package com.focusflow.task;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyGoalRepository extends JpaRepository<DailyGoal, UUID> {

    @EntityGraph(attributePaths = {"task", "task.project"})
    List<DailyGoal> findByGoalDateOrderByPositionAsc(LocalDate goalDate);

    void deleteByGoalDate(LocalDate goalDate);

    List<DailyGoal> findByTaskId(UUID taskId);

    boolean existsByGoalDateAndTaskId(LocalDate goalDate, UUID taskId);

    boolean existsByGoalDateAndPosition(LocalDate goalDate, int position);
}
