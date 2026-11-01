package com.focusflow.task.controller;

import com.focusflow.common.dto.PageResponse;
import com.focusflow.task.dto.CompleteTaskRequest;
import com.focusflow.task.dto.CreateTaskRequest;
import com.focusflow.task.dto.ExecutionResponse;
import com.focusflow.task.dto.QuadrantRequest;
import com.focusflow.task.dto.ReorderRequest;
import com.focusflow.task.dto.StartTaskRequest;
import com.focusflow.task.dto.StatusRequest;
import com.focusflow.task.dto.SubtaskRequest;
import com.focusflow.task.dto.TaskResponse;
import com.focusflow.task.dto.TimelineEvent;
import com.focusflow.task.dto.UpdateSubtaskRequest;
import com.focusflow.task.dto.UpdateTaskRequest;
import com.focusflow.task.enums.PriorityMode;
import com.focusflow.task.enums.Quadrant;
import com.focusflow.task.enums.TaskStatus;
import com.focusflow.task.model.TaskFilter;
import com.focusflow.task.service.PriorityService;
import com.focusflow.task.service.TaskHistoryService;
import com.focusflow.task.service.TaskService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
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
            @RequestParam(defaultValue = "PRIORITIES") PriorityMode mode,
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
    public TaskResponse update(@PathVariable UUID id, @RequestBody UpdateTaskRequest request) {
        return service.update(id, request.toPatch());
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
    public TaskResponse start(@PathVariable UUID id, @RequestBody(required = false) StartTaskRequest request) {
        return service.start(id, request == null ? null : request.actualStartAt());
    }

    @PostMapping("/{id}/complete")
    public TaskResponse complete(@PathVariable UUID id, @RequestBody(required = false) CompleteTaskRequest request) {
        return service.complete(id, request == null ? null : request.actualStartAt(), request == null ? null : request.actualEndAt());
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
    public List<TimelineEvent> timeline(@PathVariable UUID id) {
        return history.timeline(id);
    }

    @GetMapping("/{id}/executions")
    public List<ExecutionResponse> executions(@PathVariable UUID id) {
        return history.executions(id);
    }

    @PostMapping("/{id}/subtasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse addSubtask(@PathVariable UUID id, @Valid @RequestBody SubtaskRequest request) {
        return service.addSubtask(id, request.title());
    }

    @PatchMapping("/{id}/subtasks/{subtaskId}")
    public TaskResponse updateSubtask(@PathVariable UUID id, @PathVariable UUID subtaskId,
                                      @RequestBody UpdateSubtaskRequest request) {
        return service.updateSubtask(id, subtaskId, request.toPatch());
    }

    @DeleteMapping("/{id}/subtasks/{subtaskId}")
    public TaskResponse deleteSubtask(@PathVariable UUID id, @PathVariable UUID subtaskId) {
        return service.deleteSubtask(id, subtaskId);
    }
}
