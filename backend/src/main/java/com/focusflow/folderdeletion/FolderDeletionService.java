package com.focusflow.folderdeletion;

import com.focusflow.common.exception.ApiException;
import com.focusflow.folderdeletion.dto.FolderDeletionReport;
import com.focusflow.project.Project;
import com.focusflow.project.ProjectFolder;
import com.focusflow.project.ProjectFolderRepository;
import com.focusflow.project.ProjectRepository;
import com.focusflow.task.Task;
import com.focusflow.task.TaskRepository;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

/**
 * Suppression d'un ou plusieurs dossiers de projets (lot 27), avec le sort choisi pour leurs projets
 * (voir {@link FolderDeletionMode}). Un projet qui fait aussi partie d'un dossier conserve n'est jamais supprime.
 */
@Service
public class FolderDeletionService {

    private final ProjectFolderRepository folders;
    private final ProjectRepository projects;
    private final TaskRepository tasks;

    public FolderDeletionService(ProjectFolderRepository folders, ProjectRepository projects, TaskRepository tasks) {
        this.folders = folders;
        this.projects = projects;
        this.tasks = tasks;
    }

    /**
     * Supprime les dossiers. En mode {@code dryRun}, tout est execute puis annule : le rapport est exactement
     * celui de la suppression reelle, sans aucune ecriture.
     */
    @Transactional
    public FolderDeletionReport delete(Collection<UUID> folderIds, FolderDeletionMode mode, boolean dryRun) {
        Set<UUID> ids = folderIds == null ? Set.of() : new LinkedHashSet<>(folderIds);
        if (ids.isEmpty()) {
            throw ApiException.rule("FOLDER_DELETION_EMPTY", "Choisissez au moins un dossier a supprimer.");
        }
        if (mode == null) {
            throw new IllegalArgumentException("Le sort des projets (mode) est obligatoire.");
        }
        List<ProjectFolder> doomed = folders.findAllById(ids);
        if (doomed.size() != ids.size()) {
            UUID missing = ids.stream().filter(id -> doomed.stream().noneMatch(f -> f.getId().equals(id)))
                    .findFirst().orElseThrow();
            throw ApiException.notFound("Dossier", missing);
        }

        List<Project> concerned = projects.findAll().stream()
                .filter(p -> p.getFolders().stream().anyMatch(f -> ids.contains(f.getId())))
                .toList();
        // Projets presents seulement dans les dossiers supprimes, et projets presents aussi ailleurs.
        List<Project> only = new ArrayList<>();
        List<FolderDeletionReport.KeptProject> kept = new ArrayList<>();
        for (Project p : concerned) {
            List<String> others = p.getFolders().stream().filter(f -> !ids.contains(f.getId()))
                    .map(ProjectFolder::getName).toList();
            if (others.isEmpty()) {
                only.add(p);
            } else {
                kept.add(new FolderDeletionReport.KeptProject(p.getName(), others));
            }
        }

        int tasksDeleted = 0;
        int tasksKept = 0;
        boolean deleteProjects = mode != FolderDeletionMode.KEEP_PROJECTS;
        if (deleteProjects && !only.isEmpty()) {
            Set<UUID> doomedProjects = only.stream().map(Project::getId).collect(Collectors.toSet());
            for (Task t : tasks.findByAnyProject(doomedProjects)) {
                List<Project> remaining = t.getProjects().stream()
                        .filter(p -> !doomedProjects.contains(p.getId())).toList();
                if (mode == FolderDeletionMode.DELETE_PROJECTS_AND_TASKS && remaining.isEmpty()) {
                    tasks.delete(t);
                    tasksDeleted++;
                } else {
                    // Tache conservee : elle quitte les projets supprimes (le premier restant devient principal).
                    t.setProjects(remaining);
                    tasksKept++;
                }
            }
            tasks.flush();
        }

        for (Project p : concerned) {
            doomed.forEach(p::removeFolder);
        }
        if (deleteProjects) {
            projects.deleteAll(only);
        }
        projects.flush();
        folders.deleteAll(doomed);
        folders.flush();

        if (dryRun) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        }
        return new FolderDeletionReport(dryRun, mode.name(), doomed.size(), deleteProjects ? 0 : only.size(),
                deleteProjects ? only.size() : 0, kept, tasksDeleted, tasksKept);
    }
}
