package com.focusflow.finance;

import com.focusflow.common.PageResponse;
import com.focusflow.finance.dto.CompleteOperationRequest;
import com.focusflow.finance.dto.FinanceOverview;
import com.focusflow.finance.dto.OperationRequest;
import com.focusflow.finance.dto.OperationResponse;
import jakarta.validation.Valid;
import java.math.BigDecimal;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance")
public class OperationController {

    private final OperationService service;
    private final FinanceOverviewService overview;

    public OperationController(OperationService service, FinanceOverviewService overview) {
        this.service = service;
        this.overview = overview;
    }

    /** Soldes du jour et bilan du mois (`month` au format AAAA-MM, mois courant par defaut). */
    @GetMapping("/overview")
    public FinanceOverview overview(@RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return overview.overview(month);
    }

    /** Historique filtre et pagine, du plus recent au plus ancien. */
    @GetMapping("/operations")
    public PageResponse<OperationResponse> search(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) List<OperationType> type,
            @RequestParam(required = false) List<OperationStatus> status,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) Boolean essential,
            @RequestParam(required = false) Boolean exceptional,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return service.search(new OperationFilter(from, to, accountId, type, status, categoryId, essential, exceptional, q,
                minAmount, maxAmount), page, size);
    }

    /** Operations proches d'une saisie (meme compte, type et montant, a trois jours pres) : doublons probables. */
    @GetMapping("/operations/duplicates")
    public List<OperationResponse> duplicates(
            @RequestParam UUID accountId,
            @RequestParam OperationType type,
            @RequestParam BigDecimal amount,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) UUID excludeId) {
        return service.possibleDuplicates(accountId, type, amount, date, excludeId);
    }

    @GetMapping("/operations/{id}")
    public OperationResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping("/operations")
    @ResponseStatus(HttpStatus.CREATED)
    public OperationResponse create(@Valid @RequestBody OperationRequest request) {
        return service.get(service.create(request));
    }

    @PutMapping("/operations/{id}")
    public OperationResponse update(@PathVariable UUID id, @Valid @RequestBody OperationRequest request) {
        service.update(id, request);
        return service.get(id);
    }

    @PostMapping("/operations/{id}/complete")
    public OperationResponse complete(@PathVariable UUID id, @Valid @RequestBody CompleteOperationRequest request) {
        service.complete(id, request);
        return service.get(id);
    }

    @PostMapping("/operations/{id}/cancel")
    public OperationResponse cancel(@PathVariable UUID id) {
        service.cancel(id);
        return service.get(id);
    }

    @DeleteMapping("/operations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
