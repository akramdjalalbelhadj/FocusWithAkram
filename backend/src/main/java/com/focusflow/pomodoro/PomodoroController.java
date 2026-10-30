package com.focusflow.pomodoro;

import java.util.UUID;

import com.focusflow.common.PageResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pomodoro")
public class PomodoroController {

    private final PomodoroService service;

    public PomodoroController(PomodoroService service) {
        this.service = service;
    }

    @GetMapping("/sessions/active")
    public PomodoroService.SessionState active() {
        return service.active();
    }

    @PostMapping("/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public PomodoroService.SessionState start(@RequestBody(required = false) PomodoroService.StartRequest request) {
        return service.start(request == null ? new PomodoroService.StartRequest(null, null, null) : request);
    }

    @PostMapping("/sessions/{id}/pause")
    public PomodoroService.SessionState pause(@PathVariable UUID id) {
        return service.pause(id);
    }

    @PostMapping("/sessions/{id}/resume")
    public PomodoroService.SessionState resume(@PathVariable UUID id) {
        return service.resume(id);
    }

    @PostMapping("/sessions/{id}/complete")
    public PomodoroService.SessionState complete(@PathVariable UUID id) {
        return service.complete(id);
    }

    @PostMapping("/sessions/{id}/cancel")
    public PomodoroService.SessionState cancel(@PathVariable UUID id) {
        return service.cancel(id);
    }

    /** Historique par jour (date, heure de debut/fin, duree travaillee) : jours locaux inclus. */
    @GetMapping("/history/daily")
    public java.util.List<PomodoroService.DayHistory> dailyHistory(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate to) {
        return service.dailyHistory(from, to);
    }

    @GetMapping("/history")
    public PageResponse<PomodoroService.SessionResponse> history(@RequestParam(defaultValue = "0") int page,
                                                                 @RequestParam(defaultValue = "30") int size) {
        return service.history(page, size);
    }
}
