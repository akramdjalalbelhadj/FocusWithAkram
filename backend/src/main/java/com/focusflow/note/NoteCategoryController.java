package com.focusflow.note;

import com.focusflow.note.dto.CreateNoteCategoryRequest;
import com.focusflow.note.dto.NoteCategoryResponse;
import com.focusflow.note.dto.UpdateNoteCategoryRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
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
@RequestMapping("/api/v1/note-categories")
public class NoteCategoryController {

    private final NoteCategoryService service;

    public NoteCategoryController(NoteCategoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<NoteCategoryResponse> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteCategoryResponse create(@Valid @RequestBody CreateNoteCategoryRequest request) {
        return service.create(request);
    }

    @PatchMapping("/{id}")
    public NoteCategoryResponse update(@PathVariable UUID id, @RequestBody UpdateNoteCategoryRequest request) {
        return service.update(id, request.toPatch());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
