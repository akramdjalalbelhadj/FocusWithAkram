package com.focusflow.finance.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Depense variable plafonnee dans la feuille d'un mois. `spent` : depenses realisees du mois de la categorie (et de
 * ses sous-categories pour une racine, sauf celles qui ont leur propre enveloppe), nettes des remboursements d'achats,
 * hors echeances d'echeanciers et achats d'objectifs. `remaining` = plafond - depense (negatif en cas de depassement) ;
 * `commentRequired` : depassement sans commentaire ; `operationCount` : nombre de depenses comptees.
 */
public record EnvelopeRow(UUID envelopeId, String label, CategoryRef category, BigDecimal cap, BigDecimal spent,
                          BigDecimal remaining, boolean exceeded, String comment, boolean commentRequired,
                          int operationCount) {
}
