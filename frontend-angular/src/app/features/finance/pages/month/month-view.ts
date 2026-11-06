import type { EnvelopeRow, MonthSheet, SheetRowStatus } from '../../../../core/api/models';

/** Section d'une ligne de la feuille : revenu ou depense fixe (« Reçu » ou « Payé »). */
export type SheetKind = 'income' | 'fixed';
export type GaugeTone = 'ok' | 'warn' | 'over';

/** Part du plafond a partir de laquelle la jauge passe a l'orange. */
export const WARNING_PERCENT = 80;

export function rowStatusLabel(status: SheetRowStatus, kind: SheetKind): string {
  const income = kind === 'income';
  switch (status) {
    case 'PLANNED':
      return income ? 'Prévu' : 'À payer';
    case 'LATE':
      return 'En retard';
    case 'DONE':
      return income ? 'Reçu' : 'Payé';
    case 'SKIPPED':
      return income ? 'Pas reçu' : 'Pas payé';
  }
}

export const ROW_STATUS_BADGE: Record<SheetRowStatus, string> = {
  PLANNED: 'badge-brand',
  LATE: 'badge-danger',
  DONE: 'badge-done',
  SKIPPED: 'badge-todo',
};

/**
 * Couleur d'un ecart reel − prevu : recevoir moins ou payer plus que prevu est a surveiller (orange), l'inverse est
 * favorable (vert).
 */
export function differenceTone(difference: number | null, kind: SheetKind): string {
  if (difference === null || difference === 0) return 'text-muted';
  const favorable = kind === 'income' ? difference > 0 : difference < 0;
  return favorable ? 'text-success' : 'text-warning';
}

/** Part du plafond depensee, en % arrondi (0 sans plafond). */
export function envelopePercent(row: Pick<EnvelopeRow, 'cap' | 'spent'>): number {
  if (row.cap <= 0) return row.spent > 0 ? 100 : 0;
  return Math.max(0, Math.round((row.spent / row.cap) * 100));
}

export function envelopeTone(row: Pick<EnvelopeRow, 'cap' | 'spent' | 'exceeded'>): GaugeTone {
  if (row.exceeded) return 'over';
  return envelopePercent(row) >= WARNING_PERCENT ? 'warn' : 'ok';
}

export interface SavingsProgress {
  /** Part de l'objectif atteinte, bornee a 0–100 pour la jauge. */
  percent: number;
  reached: boolean;
  /** Reste a epargner pour atteindre l'objectif (0 si atteint). */
  missing: number;
}

/** Epargne reelle face a l'objectif du mois (null sans objectif positif). */
export function savingsProgress(actual: number, target: number | null): SavingsProgress | null {
  if (target === null || target <= 0) return null;
  const reached = actual >= target;
  return {
    percent: Math.min(100, Math.max(0, Math.round((actual / target) * 100))),
    reached,
    missing: reached ? 0 : Math.round((target - actual) * 100) / 100,
  };
}

/** Premier usage : aucune ligne de revenu, de depense fixe ni de depense variable. */
export function sheetIsEmpty(sheet: Pick<MonthSheet, 'incomes' | 'fixed' | 'variable'>): boolean {
  return sheet.incomes.length === 0 && sheet.fixed.length === 0 && sheet.variable.length === 0;
}
