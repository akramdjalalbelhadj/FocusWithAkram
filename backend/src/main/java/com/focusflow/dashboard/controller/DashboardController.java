package com.focusflow.dashboard.controller;

import com.focusflow.dashboard.dto.Summary;
import com.focusflow.dashboard.dto.Top3Request;
import com.focusflow.dashboard.dto.TopGoals;
import com.focusflow.dashboard.service.DashboardService;
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

    @GetMapping("/summary")
    public Summary summary() {
        return service.summary();
    }

    @GetMapping("/top3")
    public TopGoals top3() {
        return service.top3();
    }

    @PutMapping("/top3")
    public TopGoals setTop3(@RequestBody @jakarta.validation.Valid Top3Request request) {
        return service.setTop3(request.taskIds());
    }
}
