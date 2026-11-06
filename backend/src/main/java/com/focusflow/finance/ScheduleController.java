package com.focusflow.finance;

import com.focusflow.finance.dto.AmountChange;
import com.focusflow.finance.dto.OccurrenceRequest;
import com.focusflow.finance.dto.OperationResponse;
import com.focusflow.finance.dto.ScheduleRequest;
import com.focusflow.finance.dto.ScheduleResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance/schedules")
public class ScheduleController {

    private final ScheduleService service;
    private final OperationService operations;

    public ScheduleController(ScheduleService service, OperationService operations) {
        this.service = service;
        this.operations = operations;
    }

    @GetMapping
    public List<ScheduleResponse> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleResponse create(@Valid @RequestBody ScheduleRequest request) {
        return service.get(service.create(request));
    }

    @PutMapping("/{id}")
    public ScheduleResponse update(@PathVariable UUID id, @Valid @RequestBody ScheduleRequest request) {
        service.update(id, request);
        return service.get(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @PostMapping("/{id}/pause")
    public ScheduleResponse pause(@PathVariable UUID id) {
        service.pause(id);
        return service.get(id);
    }

    @PostMapping("/{id}/resume")
    public ScheduleResponse resume(@PathVariable UUID id) {
        service.resume(id);
        return service.get(id);
    }

    /** Resiliation : plus d'echeance apres aujourd'hui ; l'historique est conserve. */
    @PostMapping("/{id}/end")
    public ScheduleResponse end(@PathVariable UUID id) {
        service.end(id);
        return service.get(id);
    }

    /** Realise l'echeance `due` avec le montant et la date reels. */
    @PostMapping("/{id}/occurrences/{due}/complete")
    public OperationResponse complete(@PathVariable UUID id,
                                      @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate due,
                                      @Valid @RequestBody OccurrenceRequest request) {
        return operations.get(service.completeOccurrence(id, due, request));
    }

    /** Saute l'echeance `due` : elle n'est plus attendue (mois sans salaire, abonnement non renouvele). */
    @PostMapping("/{id}/occurrences/{due}/skip")
    public OperationResponse skip(@PathVariable UUID id,
                                  @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate due) {
        return operations.get(service.skipOccurrence(id, due));
    }

    /** Ajuste le montant ou la date prevus de l'echeance `due` (ce mois seulement), sans modifier l'echeancier. */
    @PutMapping("/{id}/occurrences/{due}")
    public OperationResponse adjust(@PathVariable UUID id,
                                    @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate due,
                                    @Valid @RequestBody OccurrenceRequest request) {
        return operations.get(service.adjustOccurrence(id, due, request));
    }

    /** Annule l'enregistrement de l'echeance `due` (realisee, sautee ou ajustee) : elle redevient prevue. */
    @DeleteMapping("/{id}/occurrences/{due}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetOccurrence(@PathVariable UUID id,
                                @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate due) {
        service.resetOccurrence(id, due);
    }

    /** Change le montant a partir d'un mois (cree ou remplace la version de ce mois). */
    @PutMapping("/{id}/amount")
    public ScheduleResponse changeAmount(@PathVariable UUID id, @Valid @RequestBody AmountChange change) {
        service.changeAmount(id, change);
        return service.get(id);
    }

    /** Supprime le changement de montant du mois `month` (AAAA-MM) ; le montant precedent s'applique de nouveau. */
    @DeleteMapping("/{id}/amount/{month}")
    public ScheduleResponse removeAmount(@PathVariable UUID id,
                                         @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        service.removeAmount(id, month);
        return service.get(id);
    }
}
