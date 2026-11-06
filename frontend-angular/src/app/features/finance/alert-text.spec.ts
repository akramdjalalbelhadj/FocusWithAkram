import { describe, expect, it } from 'vitest';
import type { AlertCode, FinanceAlert } from '../../core/api/models';
import { alertView } from './alert-text';

const base: FinanceAlert = {
  code: 'BUDGET_OVER',
  severity: 'DANGER',
  label: null,
  date: null,
  amount: null,
  count: null,
  refId: null,
};

describe('alertView', () => {
  it('formule un dépassement de plafond avec le montant et le pourcentage', () => {
    const v = alertView({ ...base, amount: 20, count: 120 });
    expect(v.text).toContain('dépassé de 20,00');
    expect(v.text).toContain('120 %');
    expect(v.link).toBe('month');
  });

  it('distingue une seule échéance de plusieurs', () => {
    const one = alertView({ ...base, code: 'DUE_SOON', severity: 'INFO', label: 'Loyer', date: '2026-11-03', amount: 500, count: 1 });
    expect(one.text).toMatch(/^« Loyer »/);
    const many = alertView({ ...base, code: 'DUE_SOON', severity: 'INFO', label: 'Loyer', date: '2026-11-03', amount: 650, count: 3 });
    expect(many.text).toMatch(/^3 échéances dans les 7 jours/);
    expect(many.link).toBe('analyses');
  });

  it('indique l’absence de date réaliste pour un achat', () => {
    const v = alertView({ ...base, code: 'GOAL_NOT_FEASIBLE', label: 'Vélo', amount: 5000 });
    expect(v.text).toContain('24 prochains mois');
    expect(v.link).toBe('purchases');
  });

  it('demande d’expliquer le dépassement d’une dépense variable dans Mon mois', () => {
    const v = alertView({ ...base, code: 'ENVELOPE_OVER', severity: 'WARNING', label: 'Courses', amount: 42.5 });
    expect(v.text).toMatch(/^Dépenses « Courses » au-dessus du plafond de 42,50\s?€ ce mois-ci/);
    expect(v.text).toContain('expliquez le dépassement dans Mon mois');
    expect(v.icon).toBe('alert');
    expect(v.link).toBe('month');
    expect(v.severity).toBe('WARNING');
  });

  it('mène chaque alerte vers un onglet existant de Mes achats', () => {
    const codes: AlertCode[] = [
      'BUDGET_WARNING',
      'BUDGET_OVER',
      'INCOME_LATE',
      'EXPENSES_OVERDUE',
      'DUE_SOON',
      'RESERVE_BREACH',
      'GOAL_RISKY',
      'GOAL_NOT_FEASIBLE',
      'ENVELOPE_OVER',
    ];
    for (const code of codes) {
      const v = alertView({ ...base, code, label: 'Loyer', date: '2026-11-03', amount: 10, count: 2 });
      expect(['month', 'operations', 'purchases', 'analyses'], code).toContain(v.link);
      expect(v.text.trim(), code).not.toBe('');
    }
  });
});
