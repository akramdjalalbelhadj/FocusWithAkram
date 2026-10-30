package com.focusflow.dashboard;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@Validated
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    public record Top3Request(@NotNull(message = "La liste est obligatoire.") List<UUID> taskIds) {
    }

    @GetMapping("/summary")
    public DashboardService.Summary summary() {
        return service.summary();
    }

    @GetMapping("/top3")
    public DashboardService.TopGoals top3() {
        return service.top3();
    }

    @PutMapping("/top3")
    public DashboardService.TopGoals setTop3(@RequestBody @jakarta.validation.Valid Top3Request request) {
        return service.setTop3(request.taskIds());
    }
}
