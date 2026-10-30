package com.focusflow.search;

import java.util.List;
import java.util.UUID;

import com.focusflow.project.ProjectRepository;
import com.focusflow.task.domain.Quadrant;
import com.focusflow.task.domain.TaskStatus;
import com.focusflow.task.infrastructure.TaskRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Recherche globale (palette de commandes) : taches, y compris archivees, et projets. */
@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

    public record TaskHit(UUID id, String title, TaskStatus status, Quadrant quadrant, boolean archived) {
    }

    public record ProjectHit(UUID id, String name, String color) {
    }

    public record SearchResponse(List<TaskHit> tasks, List<ProjectHit> projects) {
    }

    private final TaskRepository tasks;
    private final ProjectRepository projects;

    public SearchController(TaskRepository tasks, ProjectRepository projects) {
        this.tasks = tasks;
        this.projects = projects;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public SearchResponse search(@RequestParam(defaultValue = "") String q) {
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
