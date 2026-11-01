package com.focusflow.finance;

import com.focusflow.finance.dto.AccountResponse;
import com.focusflow.finance.dto.CreateAccountRequest;
import com.focusflow.finance.dto.OperationResponse;
import com.focusflow.finance.dto.ReconcileRequest;
import com.focusflow.finance.dto.UpdateAccountRequest;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance/accounts")
public class AccountController {

    private final AccountService service;
    private final OperationService operations;

    public AccountController(AccountService service, OperationService operations) {
        this.service = service;
        this.operations = operations;
    }

    @GetMapping
    public List<AccountResponse> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse create(@Valid @RequestBody CreateAccountRequest request) {
        return service.get(service.create(request));
    }

    @PutMapping("/{id}")
    public AccountResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateAccountRequest request) {
        service.update(id, request);
        return service.get(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    /** Rapproche le solde calcule du solde constate ; renvoie l'operation de correction creee. */
    @PostMapping("/{id}/reconcile")
    @ResponseStatus(HttpStatus.CREATED)
    public OperationResponse reconcile(@PathVariable UUID id, @Valid @RequestBody ReconcileRequest request) {
        return operations.get(service.reconcile(id, request));
    }
}
