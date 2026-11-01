import type { GoalFeasibility, GoalNote, Verdict } from '../../core/api/models';
import { formatMoney } from '../../core/util/money';
import { longDate } from '../../core/util/time';

export const VERDICT: Record<Verdict, { label: string; badge: string; icon: string }> = {
  FEASIBLE: { label: 'Réalisable', badge: 'badge-done', icon: 'circle-check' },
  RISKY: { label: 'Risqué', badge: 'badge-warning', icon: 'alert' },
  NOT_FEASIBLE: { label: 'Non réalisable', badge: 'badge-danger', icon: 'x' },
  UNKNOWN: { label: 'Indéterminé', badge: '', icon: 'info' },
};

const NOTES: Record<GoalNote, string> = {
  NO_ACCOUNT: 'Créez d’abord un compte avec votre solde actuel.',
  NO_INCOME: 'Aucun revenu prévu : seul l’argent déjà disponible est compté.',
  NO_CAP: 'Aucun plafond variable : vos dépenses courantes futures ne sont pas anticipées.',
  TARGET_PASSED: 'La date cible est dépassée : l’achat est évalué à partir d’aujourd’hui.',
  LATE_INCOME: 'Le calcul compte un salaire attendu mais pas encore reçu.',
};

/** Phrase principale expliquant le verdict, à partir des montants et dates calculés par le serveur. */
export function feasibilitySentence(f: GoalFeasibility): string {
  const date = longDate(f.evaluatedDate);
  switch (f.verdict) {
    case 'FEASIBLE':
      return `Réalisable au ${date} : il restera au moins ${formatMoney(f.lowestAfterPurchase)} disponibles dans les trois mois qui suivent l’achat.`;
    case 'RISKY':
      return `Réalisable de justesse au ${date} : la marge au-dessus de votre réserve de sécurité ne serait que de ${formatMoney(f.margin)}.`;
    case 'NOT_FEASIBLE':
      return f.feasibleDate
        ? `Votre achat de ${formatMoney(f.need)} n’est pas compatible avec votre budget prévisionnel au ${date}. Selon vos revenus et dépenses prévus, une date plus réaliste serait le ${longDate(f.feasibleDate)}.`
        : `Votre achat de ${formatMoney(f.need)} n’est pas compatible avec votre budget prévisionnel au ${date}, ni dans les 24 prochains mois selon vos revenus et dépenses prévus.`;
    case 'UNKNOWN':
      return 'Faisabilité indéterminée : les informations disponibles ne permettent pas une prévision fiable.';
  }
}

/** Éléments du calcul, affichés sous le verdict. */
export function feasibilityDetails(f: GoalFeasibility): { label: string; value: string }[] {
  const rows = [
    { label: 'Montant nécessaire', value: formatMoney(f.need) },
    { label: 'Déjà réservé', value: formatMoney(f.reserved) },
    { label: 'Reste à financer', value: formatMoney(f.remainingToFund) },
    { label: 'Disponible libre prévu à la date', value: formatMoney(f.availableAtDate) },
    { label: 'Point le plus bas après l’achat', value: formatMoney(f.lowestAfterPurchase) },
  ];
  if (f.fromSavings > 0) rows.push({ label: 'Pris sur l’épargne', value: formatMoney(f.fromSavings) });
  if (f.feasibleDate) rows.push({ label: 'Réalisable à partir du', value: longDate(f.feasibleDate) });
  return rows;
}

export function feasibilityNotes(f: GoalFeasibility): string[] {
  return f.notes.map((n) => NOTES[n]);
}
