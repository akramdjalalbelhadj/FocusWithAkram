package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

/**
 * Depense variable plafonnee (« enveloppe ») : categorie suivie (et ses sous-categories pour une racine), mois de
 * debut et de fin (absent : sans fin), plafonds dates (le premier au premier mois) et plafond du mois en cours
 * (`currentAmount`, absent si elle n'est pas suivie ce mois-ci).
 */
public record EnvelopeResponse(UUID id, String label, CategoryRef category, int position, YearMonth startMonth,
                               YearMonth endMonth, List<AmountVersion> amounts, BigDecimal currentAmount) {
}
