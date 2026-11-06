package com.focusflow.finance;

import com.focusflow.finance.dto.AmountChange;
import com.focusflow.finance.dto.EnvelopeActualRequest;
import com.focusflow.finance.dto.EnvelopeCommentRequest;
import com.focusflow.finance.dto.EnvelopeEndRequest;
import com.focusflow.finance.dto.EnvelopeRequest;
import com.focusflow.finance.dto.EnvelopeResponse;
import com.focusflow.finance.dto.EnvelopeRow;
import com.focusflow.finance.dto.EnvelopeUpdateRequest;
import jakarta.validation.Valid;
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

/** Depenses variables plafonnees (« enveloppes ») : plafonds dates et suivi de chaque mois. */
@RestController
@RequestMapping("/api/v1/finance/envelopes")
public class EnvelopeController {

    private final EnvelopeService service;

    public EnvelopeController(EnvelopeService service) {
        this.service = service;
    }

    @GetMapping
    public List<EnvelopeResponse> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EnvelopeResponse create(@Valid @RequestBody EnvelopeRequest request) {
        return service.get(service.create(request));
    }

    /** Libelle et rang d'affichage. */
    @PutMapping("/{id}")
    public EnvelopeResponse update(@PathVariable UUID id, @Valid @RequestBody EnvelopeUpdateRequest request) {
        service.update(id, request);
        return service.get(id);
    }

    /** Plafond a partir d'un mois (cree ou remplace la version de ce mois). */
    @PutMapping("/{id}/amount")
    public EnvelopeResponse changeAmount(@PathVariable UUID id, @Valid @RequestBody AmountChange change) {
        service.changeAmount(id, change);
        return service.get(id);
    }

    /** Plus de plafond apres le dernier mois indique. */
    @PostMapping("/{id}/end")
    public EnvelopeResponse end(@PathVariable UUID id, @Valid @RequestBody EnvelopeEndRequest request) {
        service.end(id, request);
        return service.get(id);
    }

    /** Supprime l'enveloppe ; les operations restent. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    /** Commentaire du mois `month` (AAAA-MM) ; vide : supprime. */
    @PutMapping("/{id}/months/{month}/comment")
    public EnvelopeRow comment(@PathVariable UUID id,
                               @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
                               @Valid @RequestBody EnvelopeCommentRequest request) {
        return service.comment(id, month, request.comment());
    }

    /** Total depense du mois `month` (AAAA-MM) : une operation de total complete les depenses deja saisies. */
    @PutMapping("/{id}/months/{month}/actual")
    public EnvelopeRow actual(@PathVariable UUID id,
                              @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
                              @Valid @RequestBody EnvelopeActualRequest request) {
        return service.actual(id, month, request);
    }
}
