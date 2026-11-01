package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Alerte calculee a la lecture (jamais stockee), formulee par l'interface a partir de son code :
 * <ul>
 *   <li>{@code BUDGET_WARNING} / {@code BUDGET_OVER} : plafond variable du mois au seuil d'alerte / depasse
 *       ({@code amount} = reste ou depassement, {@code count} = pourcentage utilise) ;</li>
 *   <li>{@code INCOME_LATE} : revenu prevu non recu a sa date ({@code label}, {@code date}, {@code amount}) ;</li>
 *   <li>{@code EXPENSES_OVERDUE} : depenses prevues dont la date est passee ({@code count}, {@code amount}) ;</li>
 *   <li>{@code DUE_SOON} : depenses prevues dans les 7 jours ({@code count}, {@code amount}, premiere {@code date}
 *       et {@code label}) ;</li>
 *   <li>{@code RESERVE_BREACH} : disponible prevu sous la reserve de securite dans les 60 jours (premiere
 *       {@code date}, point le plus bas {@code amount}) ;</li>
 *   <li>{@code GOAL_RISKY} / {@code GOAL_NOT_FEASIBLE} : objectif d'achat ({@code label}, {@code refId},
 *       {@code date} = date realiste) ;</li>
 *   <li>{@code LOAN_OVERDUE_LENT} / {@code LOAN_OVERDUE_BORROWED} : pret ou emprunt en retard ({@code label} =
 *       personne, {@code amount} = reste du, {@code date} = echeance).</li>
 * </ul>
 * {@code severity} : DANGER, WARNING ou INFO.
 */
public record FinanceAlert(String code, String severity, String label, LocalDate date, BigDecimal amount,
                           Integer count, UUID refId) {
}
