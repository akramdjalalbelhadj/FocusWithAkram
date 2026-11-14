package com.focusflow.project;

import com.focusflow.project.dto.FolderWriteRequest;
import com.focusflow.project.dto.ProjectFolderResponse;
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
@RequestMapping("/api/v1/project-folders")
public class ProjectFolderController {

    private final ProjectFolderService service;

    public ProjectFolderController(ProjectFolderService service) {
        this.service = service;
    }

    @GetMapping
    public List<ProjectFolderResponse> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectFolderResponse create(@RequestBody FolderWriteRequest request) {
        return service.response(service.create(request.toPatch()));
    }

    @PatchMapping("/{id}")
    public ProjectFolderResponse update(@PathVariable UUID id, @RequestBody FolderWriteRequest request) {
        return service.response(service.update(id, request.toPatch()));
    }

    /** Supprime le dossier ; ses projets (et leurs taches) sont conserves, sans dossier. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
