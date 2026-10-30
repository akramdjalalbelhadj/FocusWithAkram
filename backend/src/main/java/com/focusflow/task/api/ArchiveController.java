package com.focusflow.task.api;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.focusflow.common.PageResponse;
import com.focusflow.task.application.ArchiveService;
import com.focusflow.task.domain.Quadrant;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tasks/archives")
public class ArchiveController {

    private final ArchiveService service;

    public ArchiveController(ArchiveService service) {
        this.service = service;
    }

    /** Dates {@code from}/{@code to} : jours locaux (fuseau des parametres), bornes incluses. */
    @GetMapping
    public PageResponse<ArchiveService.ArchivedTask> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) Quadrant quadrant,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "desc") String order) {
        return service.list(new ArchiveService.ArchiveFilter(q, projectId, quadrant, from, to), page, size,
                !"asc".equalsIgnoreCase(order));
    }

    @GetMapping("/facets")
    public List<ArchiveService.DayCount> facets() {
        return service.facets();
    }

    @GetMapping("/{id}")
    public ArchiveService.ArchivedTask get(@PathVariable UUID id) {
        return service.get(id);
    }
}
