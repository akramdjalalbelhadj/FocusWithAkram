package com.focusflow.task;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tags")
public class TagController {

    private final TaskService service;

    public TagController(TaskService service) {
        this.service = service;
    }

    @GetMapping
    public List<String> list() {
        return service.listTags();
    }
}
