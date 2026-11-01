package com.focusflow.finance;

import com.focusflow.finance.dto.LoanRequest;
import com.focusflow.finance.dto.LoanResponse;
import com.focusflow.finance.dto.LoanUpdateRequest;
import com.focusflow.finance.dto.RepaymentRequest;
import com.focusflow.finance.dto.WriteOffRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance/loans")
public class LoanController {

    private final LoanService service;

    public LoanController(LoanService service) {
        this.service = service;
    }

    @GetMapping
    public List<LoanResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public LoanResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse create(@Valid @RequestBody LoanRequest request) {
        return service.get(service.create(request));
    }

    @PutMapping("/{id}")
    public LoanResponse update(@PathVariable UUID id, @Valid @RequestBody LoanUpdateRequest request) {
        service.update(id, request);
        return service.get(id);
    }

    @PostMapping("/{id}/repayments")
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse repay(@PathVariable UUID id, @Valid @RequestBody RepaymentRequest request) {
        service.repay(id, request);
        return service.get(id);
    }

    @PostMapping("/{id}/write-off")
    public LoanResponse writeOff(@PathVariable UUID id, @Valid @RequestBody WriteOffRequest request) {
        service.writeOff(id, request.reason());
        return service.get(id);
    }

    @PostMapping("/{id}/cancel")
    public LoanResponse cancel(@PathVariable UUID id) {
        service.cancel(id);
        return service.get(id);
    }
}
