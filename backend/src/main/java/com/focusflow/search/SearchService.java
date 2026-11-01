package com.focusflow.search;

import com.focusflow.project.ProjectRepository;
import com.focusflow.search.dto.ProjectHit;
import com.focusflow.search.dto.SearchResponse;
import com.focusflow.search.dto.TaskHit;
import com.focusflow.task.TaskRepository;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

/** Recherche globale (palette de commandes) : taches, y compris archivees, et projets. */
@org.springframework.stereotype.Service
public class SearchService {

    private final TaskRepository tasks;
    private final ProjectRepository projects;

    public SearchService(TaskRepository tasks, ProjectRepository projects) {
        this.tasks = tasks;
        this.projects = projects;
    }

    @Transactional(readOnly = true)
    public SearchResponse search(String q) {
        String term = q.strip();
        if (term.isEmpty()) {
            return new SearchResponse(List.of(), List.of());
        }
        return new SearchResponse(
                tasks.findTop10ByTitleContainingIgnoreCaseOrderByUpdatedAtDesc(term).stream()
                        .map(t -> new TaskHit(t.getId(), t.getTitle(), t.getStatus(), t.getQuadrant(), t.getArchivedAt() != null))
                        .toList(),
                projects.findTop10ByNameContainingIgnoreCaseOrderByNameAsc(term).stream()
                        .map(p -> new ProjectHit(p.getId(), p.getName(), p.getColor())).toList());
    }
}
