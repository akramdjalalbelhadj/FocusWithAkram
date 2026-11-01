package com.focusflow.finance.dto;

import java.math.BigDecimal;

/**
 * Jauge du plafond des depenses variables : OK sous le seuil d'alerte, WARNING du seuil au plafond inclus, OVER au-dela,
 * NONE sans plafond. Le pourcentage affiche est arrondi ; l'etat est calcule sur les valeurs exactes.
 */
public record BudgetGauge(BigDecimal cap, BigDecimal used, BigDecimal remaining, Integer percent, String state) {
}
