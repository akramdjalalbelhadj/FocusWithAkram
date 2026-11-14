package com.focusflow.project;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProjectFolderRepository extends JpaRepository<ProjectFolder, UUID> {

    List<ProjectFolder> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    /** Nombre de projets par dossier : [folderId, nombre] (un projet compte dans chacun de ses dossiers). */
    @Query("select f.id, count(p) from Project p join p.folders f group by f.id")
    List<Object[]> projectCounts();
}
