package com.focusflow.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;

/** Preferences financieres (singleton) : reserve de securite, plancher d'epargne, valeurs budgetaires par defaut. */
@Entity
@Table(name = "fin_preferences")
public class FinancePreferences {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id = SINGLETON_ID;

    /** Solde disponible minimal a ne jamais entamer dans les previsions. */
    @Column(name = "safety_reserve", nullable = false, precision = 12, scale = 2)
    private BigDecimal safetyReserve = Money.ZERO;

    /** Epargne minimale a conserver quand un achat est finance par l'epargne. */
    @Column(name = "savings_floor", nullable = false, precision = 12, scale = 2)
    private BigDecimal savingsFloor = Money.ZERO;

    @Column(name = "default_variable_cap", precision = 12, scale = 2)
    private BigDecimal defaultVariableCap;

    @Column(name = "default_savings_target", precision = 12, scale = 2)
    private BigDecimal defaultSavingsTarget;

    /** Pourcentage du plafond variable a partir duquel l'indicateur passe a l'orange. */
    @Column(name = "warning_percent", nullable = false)
    private int warningPercent = 80;

    @Version
    private long version;

    public BigDecimal getSafetyReserve() { return safetyReserve; }
    public void setSafetyReserve(BigDecimal safetyReserve) { this.safetyReserve = safetyReserve; }
    public BigDecimal getSavingsFloor() { return savingsFloor; }
    public void setSavingsFloor(BigDecimal savingsFloor) { this.savingsFloor = savingsFloor; }
    public BigDecimal getDefaultVariableCap() { return defaultVariableCap; }
    public void setDefaultVariableCap(BigDecimal defaultVariableCap) { this.defaultVariableCap = defaultVariableCap; }
    public BigDecimal getDefaultSavingsTarget() { return defaultSavingsTarget; }
    public void setDefaultSavingsTarget(BigDecimal defaultSavingsTarget) { this.defaultSavingsTarget = defaultSavingsTarget; }
    public int getWarningPercent() { return warningPercent; }
    public void setWarningPercent(int warningPercent) { this.warningPercent = warningPercent; }
}
