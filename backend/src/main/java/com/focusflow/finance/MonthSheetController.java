package com.focusflow.finance;

import com.focusflow.finance.dto.MonthSheet;
import java.time.YearMonth;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Feuille du mois de « Mes achats » : prevu et reel des revenus, depenses fixes, depenses variables et epargne. */
@RestController
@RequestMapping("/api/v1/finance/months")
public class MonthSheetController {

    private final MonthSheetService service;

    public MonthSheetController(MonthSheetService service) {
        this.service = service;
    }

    /** Feuille du mois `month` (AAAA-MM). */
    @GetMapping("/{month}/sheet")
    public MonthSheet sheet(@PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return service.sheet(month);
    }
}
