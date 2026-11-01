import { describe, expect, it } from 'vitest';
import type { FinanceAlert } from '../../core/api/models';
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
    expect(v.link).toBe('budget');
  });

  it('distingue une seule échéance de plusieurs', () => {
    const one = alertView({ ...base, code: 'DUE_SOON', severity: 'INFO', label: 'Loyer', date: '2026-11-03', amount: 500, count: 1 });
    expect(one.text).toMatch(/^« Loyer »/);
    const many = alertView({ ...base, code: 'DUE_SOON', severity: 'INFO', label: 'Loyer', date: '2026-11-03', amount: 650, count: 3 });
    expect(many.text).toMatch(/^3 échéances dans les 7 jours/);
    expect(many.link).toBe('calendar');
  });

  it('indique l’absence de date réaliste pour un achat', () => {
    const v = alertView({ ...base, code: 'GOAL_NOT_FEASIBLE', label: 'Vélo', amount: 5000 });
    expect(v.text).toContain('24 prochains mois');
    expect(v.link).toBe('purchases');
  });

  it('nomme la personne d’un prêt en retard', () => {
    const v = alertView({ ...base, code: 'LOAN_OVERDUE_BORROWED', label: 'Nadia', date: '2026-10-01', amount: 100 });
    expect(v.text).toContain('à Nadia');
    expect(v.link).toBe('loans');
  });
});
