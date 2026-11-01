package com.focusflow.eisenhower.controller;

import com.focusflow.eisenhower.dto.MatrixResponse;
import com.focusflow.eisenhower.service.MatrixService;
import com.focusflow.task.enums.TaskStatus;
import com.focusflow.task.model.TaskFilter;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/eisenhower")
public class MatrixController {

    private final MatrixService service;

    public MatrixController(MatrixService service) {
        this.service = service;
    }

    @GetMapping("/matrix")
    public MatrixResponse matrix(@RequestParam(required = false) String q,
                                               @RequestParam(required = false) TaskStatus status,
                                               @RequestParam(required = false) UUID projectId,
                                               @RequestParam(required = false) String tag,
                                               @RequestParam(required = false) Boolean overdue) {
        return service.matrix(new TaskFilter(q, status, null, projectId, tag, null, null, overdue, null));
    }
}
