package com.focusflow.note;

import com.focusflow.common.PageResponse;
import com.focusflow.note.dto.CreateNoteRequest;
import com.focusflow.note.dto.CreateTaskFromNoteRequest;
import com.focusflow.note.dto.NoteResponse;
import com.focusflow.note.dto.NoteSummary;
import com.focusflow.note.dto.UpdateNoteRequest;
import com.focusflow.task.dto.TaskResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1/notes")
public class NoteController {

    private final NoteService service;

    public NoteController(NoteService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<NoteSummary> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Boolean favorite,
            @RequestParam(required = false) Boolean withTasks,
            @RequestParam(required = false) Boolean archived,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "updatedAt") String sort,
            @RequestParam(defaultValue = "desc") String dir) {
        return service.search(new NoteFilter(q, categoryId, tag, favorite, withTasks, archived), page, size, sort,
                !"asc".equalsIgnoreCase(dir));
    }

    @GetMapping("/tags")
    public List<String> tags() {
        return service.tags();
    }

    @GetMapping("/{id}")
    public NoteResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse create(@Valid @RequestBody CreateNoteRequest request) {
        return service.create(request);
    }

    @PatchMapping("/{id}")
    public NoteResponse update(@PathVariable UUID id, @RequestBody UpdateNoteRequest request) {
        return service.update(id, request.toPatch());
    }

    /**
     * Sans {@code mode} : ancien comportement (409 NOTE_HAS_TASKS si des taches en sont issues, sauf
     * {@code force=true}). {@code mode=archive} : range l'idee dans les archives. {@code mode=delete} : supprime
     * l'idee ; si des taches en sont issues, elle reste 72 heures dans les archives avant d'etre effacee.
     * Renvoie l'idee archivee (200), ou rien (204) si elle a ete effacee.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<NoteResponse> delete(@PathVariable UUID id,
                                               @RequestParam(defaultValue = "false") boolean force,
                                               @RequestParam(required = false) String mode) {
        if (mode == null) {
            service.delete(id, force);
            return ResponseEntity.noContent().build();
        }
        NoteResponse archived = service.remove(id, mode);
        return archived == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(archived);
    }

    /** Sort une idee des archives (annule aussi une suppression programmee). */
    @PostMapping("/{id}/restore")
    public NoteResponse restore(@PathVariable UUID id) {
        return service.restore(id);
    }

    @PostMapping("/{id}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse createTask(@PathVariable UUID id, @Valid @RequestBody CreateTaskFromNoteRequest request) {
        return service.createTask(id, request);
    }
}
