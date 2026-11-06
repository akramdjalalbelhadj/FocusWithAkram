import { describe, expect, it } from 'vitest';
import {
  differenceTone,
  envelopePercent,
  envelopeTone,
  rowStatusLabel,
  savingsProgress,
  sheetIsEmpty,
} from './month-view';

describe('month-view', () => {
  it('nomme l’etat d’une ligne selon la section', () => {
    expect(rowStatusLabel('DONE', 'income')).toBe('Reçu');
    expect(rowStatusLabel('DONE', 'fixed')).toBe('Payé');
    expect(rowStatusLabel('PLANNED', 'fixed')).toBe('À payer');
    expect(rowStatusLabel('SKIPPED', 'income')).toBe('Pas reçu');
    expect(rowStatusLabel('LATE', 'income')).toBe('En retard');
  });

  it('colore un ecart : moins recu ou plus paye est a surveiller', () => {
    expect(differenceTone(-120, 'income')).toBe('text-warning');
    expect(differenceTone(50, 'income')).toBe('text-success');
    expect(differenceTone(20, 'fixed')).toBe('text-warning');
    expect(differenceTone(-5, 'fixed')).toBe('text-success');
    expect(differenceTone(0, 'fixed')).toBe('text-muted');
    expect(differenceTone(null, 'income')).toBe('text-muted');
  });

  it('calcule la part du plafond et la couleur de la jauge', () => {
    expect(envelopePercent({ cap: 300, spent: 150 })).toBe(50);
    expect(envelopePercent({ cap: 300, spent: 345 })).toBe(115);
    expect(envelopePercent({ cap: 0, spent: 0 })).toBe(0);
    expect(envelopeTone({ cap: 300, spent: 150, exceeded: false })).toBe('ok');
    expect(envelopeTone({ cap: 300, spent: 250, exceeded: false })).toBe('warn');
    expect(envelopeTone({ cap: 300, spent: 345, exceeded: true })).toBe('over');
  });

  it('compare l’epargne reelle a l’objectif', () => {
    expect(savingsProgress(150, 300)).toEqual({ percent: 50, reached: false, missing: 150 });
    expect(savingsProgress(320, 300)).toEqual({ percent: 100, reached: true, missing: 0 });
    expect(savingsProgress(-80, 300)).toEqual({ percent: 0, reached: false, missing: 380 });
    expect(savingsProgress(100, null)).toBeNull();
    expect(savingsProgress(100, 0)).toBeNull();
  });

  it('detecte le premier usage', () => {
    expect(sheetIsEmpty({ incomes: [], fixed: [], variable: [] })).toBe(true);
    expect(sheetIsEmpty({ incomes: [], fixed: [], variable: [{} as never] })).toBe(false);
  });
});
