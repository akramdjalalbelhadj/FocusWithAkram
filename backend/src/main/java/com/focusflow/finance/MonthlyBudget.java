package com.focusflow.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Budget d'un mois civil. Une valeur absente reprend la valeur par defaut des preferences financieres. */
@Entity
@Table(name = "fin_budget")
public class MonthlyBudget {

    @Id
    private UUID id = UUID.randomUUID();

    /** Premier jour du mois. */
    @Column(nullable = false, unique = true)
    private LocalDate month;

    @Column(name = "variable_cap", precision = 12, scale = 2)
    private BigDecimal variableCap;

    @Column(name = "savings_target", precision = 12, scale = 2)
    private BigDecimal savingsTarget;

    @Version
    private long version;

    protected MonthlyBudget() {
    }

    public MonthlyBudget(LocalDate month) {
        this.month = month.withDayOfMonth(1);
    }

    public UUID getId() { return id; }
    public LocalDate getMonth() { return month; }
    public BigDecimal getVariableCap() { return variableCap; }
    public void setVariableCap(BigDecimal variableCap) { this.variableCap = variableCap; }
    public BigDecimal getSavingsTarget() { return savingsTarget; }
    public void setSavingsTarget(BigDecimal savingsTarget) { this.savingsTarget = savingsTarget; }
}
