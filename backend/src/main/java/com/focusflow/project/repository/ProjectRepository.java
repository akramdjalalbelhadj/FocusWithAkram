package com.focusflow.project.repository;

import com.focusflow.project.entity.Project;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    List<Project> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCaseAndArchivedFalse(String name);

    List<Project> findTop10ByNameContainingIgnoreCaseOrderByNameAsc(String name);

    /** Progression : [projectId, totalTasks, doneTasks]. */
    @Query("select t.project.id, count(t), sum(case when t.status = com.focusflow.task.enums.TaskStatus.DONE then 1 else 0 end) "
            + "from Task t where t.project is not null group by t.project.id")
    List<Object[]> progressByProject();
}
