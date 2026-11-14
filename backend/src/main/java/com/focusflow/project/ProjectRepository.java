package com.focusflow.project;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    List<Project> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCaseAndArchivedFalse(String name);

    List<Project> findTop10ByNameContainingIgnoreCaseOrderByNameAsc(String name);

    /** Progression : [projectId, totalTasks, doneTasks]. */
    @Query(nativeQuery = true, value = "select x.pid, count(*), sum(case when x.status = 'DONE' then 1 else 0 end) from ("
            + "select t.project_id as pid, t.status from task t where t.project_id is not null "
            + "union all select e.project_id, t.status from task_extra_project e join task t on t.id = e.task_id "
            + "where t.project_id is null or t.project_id <> e.project_id) x group by x.pid")
    List<Object[]> progressByProject();

    /** Liens projet - dossier : [projectId, folderId], dossiers par nom. */
    @Query("select p.id, f.id from Project p join p.folders f order by lower(f.name)")
    List<Object[]> folderLinks();
}
