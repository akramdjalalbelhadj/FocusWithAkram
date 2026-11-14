package com.focusflow.project;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProjectFolderRepository extends JpaRepository<ProjectFolder, UUID> {

    List<ProjectFolder> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    /** Nombre de projets par dossier : [folderId, nombre]. */
    @Query("select p.folder.id, count(p) from Project p where p.folder is not null group by p.folder.id")
    List<Object[]> projectCounts();
}
