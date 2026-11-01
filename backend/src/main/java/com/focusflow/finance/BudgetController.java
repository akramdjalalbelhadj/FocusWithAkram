package com.focusflow.finance;

import com.focusflow.finance.dto.BudgetRequest;
import com.focusflow.finance.dto.BudgetResponse;
import com.focusflow.finance.dto.PreferencesRequest;
import com.focusflow.finance.dto.PreferencesResponse;
import jakarta.validation.Valid;
import java.time.YearMonth;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finance")
public class BudgetController {

    private final BudgetService service;
    private final FinanceDates dates;

    public BudgetController(BudgetService service, FinanceDates dates) {
        this.service = service;
        this.dates = dates;
    }

    /** Budget et suivi du mois (`month` au format AAAA-MM, mois courant par defaut). */
    @GetMapping("/budget")
    public BudgetResponse budget(@RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return service.budget(month == null ? YearMonth.from(dates.today()) : month);
    }

    @PutMapping("/budget/{month}")
    public BudgetResponse updateBudget(@PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
                                       @RequestBody BudgetRequest request) {
        service.updateBudget(month, request);
        return service.budget(month);
    }

    @GetMapping("/preferences")
    public PreferencesResponse preferences() {
        return service.preferencesResponse();
    }

    @PutMapping("/preferences")
    public PreferencesResponse updatePreferences(@Valid @RequestBody PreferencesRequest request) {
        service.updatePreferences(request);
        return service.preferencesResponse();
    }
}
