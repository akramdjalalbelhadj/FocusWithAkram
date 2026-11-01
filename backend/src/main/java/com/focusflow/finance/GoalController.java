package com.focusflow.finance;

import com.focusflow.finance.dto.ForecastResponse;
import com.focusflow.finance.dto.GoalFeasibility;
import com.focusflow.finance.dto.GoalRequest;
import com.focusflow.finance.dto.GoalResponse;
import com.focusflow.finance.dto.MoveGoalRequest;
import com.focusflow.finance.dto.PostponeRequest;
import com.focusflow.finance.dto.PurchaseRequest;
import com.focusflow.finance.dto.ReserveRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance")
public class GoalController {

    private final GoalService service;
    private final ForecastService forecast;

    public GoalController(GoalService service, ForecastService forecast) {
        this.service = service;
        this.forecast = forecast;
    }

    /** Prevision de tresorerie jour par jour et faisabilite des objectifs ouverts. */
    @GetMapping("/forecast")
    public ForecastResponse forecast() {
        return forecast.forecast();
    }

    @GetMapping("/goals")
    public List<GoalResponse> list() {
        return service.list();
    }

    @GetMapping("/goals/{id}")
    public GoalResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    /** Faisabilite d'un objectif avant enregistrement ; `id` pour la modification d'un objectif existant. */
    @PostMapping("/goals/preview")
    public GoalFeasibility preview(@RequestParam(required = false) UUID id, @Valid @RequestBody GoalRequest request) {
        return service.preview(id, request);
    }

    @PostMapping("/goals")
    @ResponseStatus(HttpStatus.CREATED)
    public GoalResponse create(@Valid @RequestBody GoalRequest request) {
        return service.get(service.create(request));
    }

    @PutMapping("/goals/{id}")
    public GoalResponse update(@PathVariable UUID id, @Valid @RequestBody GoalRequest request) {
        service.update(id, request);
        return service.get(id);
    }

    @DeleteMapping("/goals/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @PutMapping("/goals/{id}/reservation")
    public GoalResponse reserve(@PathVariable UUID id, @Valid @RequestBody ReserveRequest request) {
        service.reserve(id, request.amount());
        return service.get(id);
    }

    /** Achat reel : cree la depense liee et clot l'objectif. */
    @PostMapping("/goals/{id}/purchase")
    public GoalResponse purchase(@PathVariable UUID id, @Valid @RequestBody PurchaseRequest request) {
        service.purchase(id, request);
        return service.get(id);
    }

    @PostMapping("/goals/{id}/postpone")
    public GoalResponse postpone(@PathVariable UUID id, @Valid @RequestBody PostponeRequest request) {
        service.postpone(id, request.targetDate());
        return service.get(id);
    }

    @PostMapping("/goals/{id}/abandon")
    public GoalResponse abandon(@PathVariable UUID id) {
        service.abandon(id);
        return service.get(id);
    }

    @PostMapping("/goals/{id}/reopen")
    public GoalResponse reopen(@PathVariable UUID id) {
        service.reopen(id);
        return service.get(id);
    }

    /** Deplacement dans la matrice des achats (quadrant et ordre). */
    @PutMapping("/goals/{id}/position")
    public GoalResponse move(@PathVariable UUID id, @RequestBody MoveGoalRequest request) {
        service.move(id, request);
        return service.get(id);
    }
}
