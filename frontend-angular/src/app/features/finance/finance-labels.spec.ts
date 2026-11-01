import { describe, expect, it } from 'vitest';
import { sumMoney } from '../../core/util/money-sum';
import { frequencyLabel, operationSign } from './finance-labels';

describe('finance-labels', () => {
  it('décrit la périodicité en français', () => {
    expect(frequencyLabel('MONTHLY', 1)).toBe('Chaque mois');
    expect(frequencyLabel('MONTHLY', 3)).toBe('Tous les 3 mois');
    expect(frequencyLabel('WEEKLY', 2)).toBe('Toutes les 2 semaines');
    expect(frequencyLabel('YEARLY', 1)).toBe('Chaque année');
  });

  it('donne le sens d’une opération pour l’utilisateur', () => {
    expect(operationSign({ type: 'INCOME', direction: 'CREDIT' })).toBe(1);
    expect(operationSign({ type: 'EXPENSE', direction: 'DEBIT' })).toBe(-1);
    expect(operationSign({ type: 'TRANSFER', direction: 'DEBIT' })).toBe(0);
  });

  it('additionne des montants au centime sans erreur de virgule flottante', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([21.6, 13.49, 9.99])).toBe(45.08);
    expect(sumMoney([])).toBe(0);
  });
});
