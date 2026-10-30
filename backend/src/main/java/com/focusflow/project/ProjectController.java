package com.focusflow.project;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.focusflow.common.Patch;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    public record ProjectResponse(UUID id, String name, String description, String color, String icon, Instant dueAt,
                                  boolean archived, Instant createdAt, long totalTasks, long doneTasks) {

        static ProjectResponse from(ProjectService.ProjectView v) {
            Project p = v.project();
            return new ProjectResponse(p.getId(), p.getName(), p.getDescription(), p.getColor(), p.getIcon(),
                    p.getDueAt(), p.isArchived(), p.getCreatedAt(), v.totalTasks(), v.doneTasks());
        }
    }

    @GetMapping
    public List<ProjectResponse> list() {
        return service.list().stream().map(ProjectResponse::from).toList();
    }

    @GetMapping("/{id}")
    public ProjectResponse get(@PathVariable UUID id) {
        return ProjectResponse.from(service.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@RequestBody Map<String, Object> body) {
        UUID id = service.create(new Patch(body)).getId();
        return ProjectResponse.from(service.get(id));
    }

    @PatchMapping("/{id}")
    public ProjectResponse update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        service.update(id, new Patch(body));
        return ProjectResponse.from(service.get(id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
