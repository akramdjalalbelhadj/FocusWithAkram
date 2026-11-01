import { describe, expect, it } from 'vitest';
import { amountInput, formatMoney, parseAmount } from './money';

describe('money', () => {
  it('lit les montants saisis en français, sans arrondi silencieux', () => {
    expect(parseAmount('12,5')).toBe(12.5);
    expect(parseAmount('1 200,05 €')).toBe(1200.05);
    expect(parseAmount('0.1')).toBe(0.1);
    expect(parseAmount('12,345')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });

  it('refuse un montant négatif sauf autorisation explicite', () => {
    expect(parseAmount('-20')).toBeNull();
    expect(parseAmount('-20,50', true)).toBe(-20.5);
  });

  it('formate en euros à la française', () => {
    expect(formatMoney(1234.5).replace(/\s/g, ' ')).toBe('1 234,50 €');
    expect(formatMoney(null)).toBe('—');
    expect(amountInput(7)).toBe('7,00');
  });
});
