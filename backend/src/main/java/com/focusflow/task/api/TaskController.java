package com.focusflow.task.api;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.focusflow.common.PageResponse;
import com.focusflow.common.Patch;
import com.focusflow.task.application.PriorityService;
import com.focusflow.task.application.TaskFilter;
import com.focusflow.task.application.TaskHistoryService;
import com.focusflow.task.application.TaskService;
import com.focusflow.task.domain.Quadrant;
import com.focusflow.task.domain.TaskStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private final TaskService service;
    private final PriorityService priorities;
    private final TaskHistoryService history;

    public TaskController(TaskService service, PriorityService priorities, TaskHistoryService history) {
        this.service = service;
        this.priorities = priorities;
        this.history = history;
    }

    public record StatusRequest(@NotNull(message = "Le statut est obligatoire.") TaskStatus status, Instant actualStartAt) {
    }

    public record QuadrantRequest(@NotNull(message = "Le quadrant est obligatoire.") Quadrant quadrant) {
    }

    public record ReorderRequest(@NotNull(message = "Le quadrant est obligatoire.") Quadrant quadrant,
                                 @NotNull(message = "La liste est obligatoire.") @NotEmpty(message = "La liste est vide.") List<UUID> taskIds) {
    }

    public record SubtaskRequest(@NotNull(message = "Le titre est obligatoire.") String title) {
    }

    @GetMapping
    public PageResponse<TaskResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Quadrant quadrant,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dueFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dueTo,
            @RequestParam(required = false) Boolean overdue,
            @RequestParam(required = false) Boolean unplanned,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String dir) {
        TaskFilter filter = new TaskFilter(q, status, quadrant, projectId, tag, dueFrom, dueTo, overdue, unplanned);
        return service.search(filter, page, size, sort, !"asc".equalsIgnoreCase(dir));
    }

    @GetMapping("/priorities")
    public List<TaskResponse> priorities(
            @RequestParam(defaultValue = "PRIORITIES") PriorityService.Mode mode,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) String tag) {
        return priorities.priorities(mode, new TaskFilter(q, null, null, projectId, tag, null, null, null, null));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(@Valid @RequestBody CreateTaskRequest request) {
        return service.create(request);
    }

    @PatchMapping("/reorder")
    public List<TaskResponse> reorder(@Valid @RequestBody ReorderRequest request) {
        return service.reorder(request.quadrant(), request.taskIds());
    }

    @GetMapping("/{id}")
    public TaskResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PatchMapping("/{id}")
    public TaskResponse update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return service.update(id, new Patch(body));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @PatchMapping("/{id}/status")
    public TaskResponse status(@PathVariable UUID id, @Valid @RequestBody StatusRequest request) {
        return service.changeStatus(id, request.status(), request.actualStartAt());
    }

    @PatchMapping("/{id}/quadrant")
    public TaskResponse quadrant(@PathVariable UUID id, @Valid @RequestBody QuadrantRequest request) {
        return service.moveToQuadrant(id, request.quadrant());
    }

    @PostMapping("/{id}/start")
    public TaskResponse start(@PathVariable UUID id, @RequestBody(required = false) Map<String, Object> body) {
        return service.start(id, new Patch(body).instant("actualStartAt"));
    }

    @PostMapping("/{id}/complete")
    public TaskResponse complete(@PathVariable UUID id, @RequestBody(required = false) Map<String, Object> body) {
        Patch p = new Patch(body);
        return service.complete(id, p.instant("actualStartAt"), p.instant("actualEndAt"));
    }

    @PostMapping("/{id}/restore")
    public TaskResponse restore(@PathVariable UUID id) {
        return service.restore(id);
    }

    @PostMapping("/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse duplicate(@PathVariable UUID id) {
        return service.duplicate(id);
    }

    @GetMapping("/{id}/timeline")
    public List<TaskHistoryService.TimelineEvent> timeline(@PathVariable UUID id) {
        return history.timeline(id);
    }

    @GetMapping("/{id}/executions")
    public List<TaskHistoryService.ExecutionResponse> executions(@PathVariable UUID id) {
        return history.executions(id);
    }

    @PostMapping("/{id}/subtasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse addSubtask(@PathVariable UUID id, @Valid @RequestBody SubtaskRequest request) {
        return service.addSubtask(id, request.title());
    }

    @PatchMapping("/{id}/subtasks/{subtaskId}")
    public TaskResponse updateSubtask(@PathVariable UUID id, @PathVariable UUID subtaskId,
                                      @RequestBody Map<String, Object> body) {
        return service.updateSubtask(id, subtaskId, new Patch(body));
    }

    @DeleteMapping("/{id}/subtasks/{subtaskId}")
    public TaskResponse deleteSubtask(@PathVariable UUID id, @PathVariable UUID subtaskId) {
        return service.deleteSubtask(id, subtaskId);
    }
}
