package com.focusflow.pomodoro;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PomodoroSessionRepository extends JpaRepository<PomodoroSession, UUID> {

    @EntityGraph(attributePaths = "task")
    Optional<PomodoroSession> findFirstByStatusIn(Collection<SessionStatus> statuses);

    @EntityGraph(attributePaths = "task")
    Page<PomodoroSession> findAllByOrderByStartedAtDesc(Pageable pageable);

    /** [taskId, executionNumber, sum(workedSeconds)] pour un lot de taches : evite un N+1 a la serialisation des listes. */
    @Query("select s.task.id, s.executionNumber, sum(s.workedSeconds) from PomodoroSession s "
            + "where s.task.id in :ids and s.type = com.focusflow.pomodoro.SessionType.WORK "
            + "group by s.task.id, s.executionNumber")
    List<Object[]> sumWorkedByTaskIds(@Param("ids") Collection<UUID> ids);

    @Query("select coalesce(sum(s.workedSeconds), 0) from PomodoroSession s "
            + "where s.task.id = :taskId and s.executionNumber = :execution "
            + "and s.type = com.focusflow.pomodoro.SessionType.WORK")
    long sumWorkedByTaskAndExecution(@Param("taskId") UUID taskId, @Param("execution") int execution);

    long countByTypeAndStatusAndEndedAtGreaterThanEqualAndEndedAtLessThan(SessionType type, SessionStatus status,
                                                                         Instant from, Instant to);

    @EntityGraph(attributePaths = "task")
    List<PomodoroSession> findByTaskIdAndTypeOrderByStartedAtAsc(UUID taskId, SessionType type);

    /** Sessions de travail cloturees dans [from, to[ (attribuees au jour de leur fin), pour stats et dashboard. */
    @Query("select s from PomodoroSession s left join fetch s.task t left join fetch t.project "
            + "where s.type = com.focusflow.pomodoro.SessionType.WORK "
            + "and s.status in (com.focusflow.pomodoro.SessionStatus.COMPLETED, com.focusflow.pomodoro.SessionStatus.CANCELLED) "
            + "and s.endedAt >= :from and s.endedAt < :to order by s.endedAt asc")
    List<PomodoroSession> findFinishedWorkBetween(@Param("from") Instant from, @Param("to") Instant to);
}
