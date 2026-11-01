package com.focusflow.finance;

import com.focusflow.finance.dto.FinanceAlert;
import com.focusflow.finance.dto.FinanceStatistics;
import com.focusflow.finance.dto.OperationResponse;
import com.focusflow.finance.dto.SimulationRequest;
import com.focusflow.finance.dto.SimulationResponse;
import jakarta.validation.Valid;
import java.time.YearMonth;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Analyses du module : alertes, statistiques, simulations et calendrier financier (tout est calcule a la lecture). */
@RestController
@RequestMapping("/api/v1/finance")
public class InsightController {

    private final AlertService alerts;
    private final FinanceStatisticsService statistics;
    private final SimulationService simulation;
    private final BudgetService budgets;
    private final FinanceDates dates;

    public InsightController(AlertService alerts, FinanceStatisticsService statistics, SimulationService simulation,
                             BudgetService budgets, FinanceDates dates) {
        this.alerts = alerts;
        this.statistics = statistics;
        this.simulation = simulation;
        this.budgets = budgets;
        this.dates = dates;
    }

    @GetMapping("/alerts")
    public List<FinanceAlert> alerts() {
        return alerts.alerts();
    }

    /** Periode en mois complets `from`..`to` (AAAA-MM) ; par defaut les 12 derniers mois. */
    @GetMapping("/statistics")
    public FinanceStatistics statistics(@RequestParam(required = false) YearMonth from,
                                        @RequestParam(required = false) YearMonth to) {
        return statistics.statistics(from, to);
    }

    /** Prevision sous hypotheses, comparee a la prevision actuelle ; rien n'est enregistre. */
    @PostMapping("/simulation")
    public SimulationResponse simulate(@Valid @RequestBody SimulationRequest request) {
        return simulation.simulate(request);
    }

    /** Operations du mois, realisees et prevues (echeances calculees comprises), hors operations annulees. */
    @GetMapping("/calendar")
    public List<OperationResponse> calendar(@RequestParam(required = false) YearMonth month) {
        return budgets.calendar(month == null ? YearMonth.from(dates.today()) : month);
    }
}
