import type { AlertSeverity, FinanceAlert } from '../../core/api/models';
import { formatMoney } from '../../core/util/money';
import { longDate } from '../../core/util/time';

export interface AlertView {
  text: string;
  icon: string;
  /** Onglet du module où agir. */
  link: string;
  severity: AlertSeverity;
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

/** Formulation d'une alerte calculée par le serveur (code et montants), avec l'onglet où agir. */
export function alertView(a: FinanceAlert): AlertView {
  const amount = formatMoney(a.amount ?? 0);
  const date = a.date ? longDate(a.date) : '';
  const n = a.count ?? 0;
  const view = (text: string, icon: string, link: string): AlertView => ({
    text,
    icon,
    link,
    severity: a.severity,
  });
  switch (a.code) {
    case 'BUDGET_OVER':
      return view(
        `Plafond des dépenses variables dépassé de ${amount} ce mois-ci (${n} %).`,
        'alert',
        'month',
      );
    case 'BUDGET_WARNING':
      return view(
        `${n} % du plafond variable utilisé : il reste ${amount} pour le mois.`,
        'target',
        'month',
      );
    case 'INCOME_LATE':
      return view(
        `« ${a.label} » (${amount}) attendu le ${date} n’est pas encore reçu.`,
        'banknote',
        'month',
      );
    case 'EXPENSES_OVERDUE':
      return view(
        n > 1
          ? `${n} dépenses prévues sont en retard (${amount}) : indiquez si elles ont été payées.`
          : `« ${a.label} » (${amount}), prévue le ${date}, est en retard : indiquez si elle a été payée.`,
        'receipt',
        'month',
      );
    case 'DUE_SOON':
      return view(
        n > 1
          ? `${n} ${plural(n, 'échéance', 'échéances')} dans les 7 jours (${amount}), à commencer par « ${a.label} » le ${date}.`
          : `« ${a.label} » (${amount}) est prévue le ${date}.`,
        'calendar-days',
        'analyses',
      );
    case 'RESERVE_BREACH':
      return view(
        `Votre disponible prévu passe sous la réserve de sécurité à partir du ${date} (jusqu’à ${amount}).`,
        'trending-down',
        'purchases',
      );
    case 'GOAL_NOT_FEASIBLE':
      return view(
        a.date
          ? `« ${a.label} » n’est plus réalisable à sa date : date réaliste le ${date}.`
          : `« ${a.label} » n’est plus réalisable dans les 24 prochains mois.`,
        'cart',
        'purchases',
      );
    case 'GOAL_RISKY':
      return view(`« ${a.label} » est devenu risqué au ${date} : la marge est faible.`, 'cart', 'purchases');
    case 'ENVELOPE_OVER':
      return view(
        `Dépenses « ${a.label} » au-dessus du plafond de ${amount} ce mois-ci : expliquez le dépassement dans Mon mois.`,
        'alert',
        'month',
      );
  }
}

export const SEVERITY_TONE: Record<AlertSeverity, string> = {
  DANGER: 'text-danger',
  WARNING: 'text-warning',
  INFO: 'text-info',
};
