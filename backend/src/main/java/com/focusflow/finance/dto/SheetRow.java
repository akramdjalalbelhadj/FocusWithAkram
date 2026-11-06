package com.focusflow.finance.dto;

import com.focusflow.finance.IncomeKind;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Ligne de revenu ou de depense fixe de la feuille du mois : une echeance d'echeancier (`key` = scheduleId/dueDate)
 * ou une operation ponctuelle (`key` = identifiant de l'operation).
 * <ul>
 *   <li>{@code date} : date de l'echeance (ou ajustee), ou date reelle une fois realisee ;</li>
 *   <li>{@code planned} : prevu du mois (absent pour une operation ponctuelle realisee sans prevision) ;
 *       {@code actual} : reel (absent tant que ce n'est pas realise) ; {@code difference} = reel - prevu ;</li>
 *   <li>{@code status} : PLANNED, LATE (prevue et date passee), DONE ou SKIPPED (sautee ou annulee) ;</li>
 *   <li>{@code adjusted} : prevu modifie pour ce mois seulement ; {@code comment} : description de l'operation.</li>
 * </ul>
 */
public record SheetRow(String key, UUID scheduleId, LocalDate dueDate, UUID operationId, String label,
                       CategoryRef category, IncomeKind incomeKind, LocalDate date, BigDecimal planned,
                       BigDecimal actual, BigDecimal difference, String status, String comment, boolean adjusted,
                       boolean essential) {
}
