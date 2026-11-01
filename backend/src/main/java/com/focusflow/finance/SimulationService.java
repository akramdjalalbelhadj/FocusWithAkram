package com.focusflow.finance;

import com.focusflow.common.exception.ApiException;
import com.focusflow.finance.dto.SimulationRequest;
import com.focusflow.finance.dto.SimulationResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Simulation (specification § 6) : les hypotheses sont appliquees au meme calcul que la prevision, sans rien
 * enregistrer, et le resultat est compare a la prevision actuelle.
 */
@Service
public class SimulationService {

    private final ForecastService forecast;
    private final GoalService goals;

    public SimulationService(ForecastService forecast, GoalService goals) {
        this.forecast = forecast;
        this.goals = goals;
    }

    @Transactional(readOnly = true)
    public SimulationResponse simulate(SimulationRequest r) {
        BigDecimal salaryDelta = r.salaryDelta() == null ? Money.ZERO : Money.cents(r.salaryDelta(), "La variation du salaire");
        BigDecimal reduction = r.variableReduction() == null ? Money.ZERO
                : Money.cents(r.variableReduction(), "La reduction des depenses variables");
        if (reduction.signum() < 0) {
            throw ApiException.rule("INVALID_SIMULATION", "La reduction des depenses variables ne peut pas etre negative.");
        }
        Map<UUID, LocalDate> postponed = new HashMap<>();
        if (r.postponements() != null) {
            for (SimulationRequest.Postponement p : r.postponements()) {
                goals.find(p.goalId());
                postponed.put(p.goalId(), p.targetDate());
            }
        }
        Set<UUID> excluded = r.excludedGoalIds() == null ? Set.of() : new HashSet<>(r.excludedGoalIds());
        Goal extra = r.extraPurchase() == null ? null : goals.hypothetical(r.extraPurchase());
        ForecastService.Scenario scenario = new ForecastService.Scenario(salaryDelta, reduction, postponed, excluded, extra);
        return new SimulationResponse(forecast.forecast(), forecast.simulate(scenario), extra == null ? null : extra.getId());
    }
}
