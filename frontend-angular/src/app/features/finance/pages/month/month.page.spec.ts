import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { FinanceApi } from '../../../../core/api/finance.api';
import { MonthSheet, SheetRow } from '../../../../core/api/models';
import { FinanceMonthPage } from './month.page';
import { sheet } from './month-sheet.fixture';

function pendingSalary(month: string): SheetRow {
  return {
    ...sheet(month).incomes[0],
    operationId: null,
    date: `${month}-28`,
    actual: null,
    difference: null,
    status: 'PLANNED',
    comment: null,
  };
}

describe('FinanceMonthPage (tableau de bord)', () => {
  let current: (month: string) => Partial<MonthSheet>;

  beforeEach(() => {
    current = () => ({});
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: FinanceApi,
          useValue: { monthSheet: (month: string) => of(sheet(month, current(month))), alerts: () => of([]) },
        },
      ],
    });
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(FinanceMonthPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('montre l’essentiel du mois sans le détail des lignes', async () => {
    const el = await render();
    for (const tour of [
      'month-nav',
      'month-summary',
      'month-balance',
      'month-revenue',
      'month-savings',
      'month-details-link',
    ]) {
      expect(el.querySelector(`[data-tour="${tour}"]`), tour).not.toBeNull();
    }
    const text = el.textContent ?? '';
    expect(text).toMatch(/1\s?234,50/);
    expect(text).toMatch(/2\s?240,00/);
    expect(text).toMatch(/1\s?895,00/);
    expect(text).toContain('Reçu le');
    expect(el.querySelector('table')).toBeNull();
    expect(text).not.toContain('Loyer');
    expect(text).not.toMatch(/épargne prévue|prévue/i);
  });

  it('revenus à 0 € tant que le salaire n’est pas saisi, le prévu sert aux calculs', async () => {
    current = (month) => ({
      incomes: [pendingSalary(month)],
      totals: { ...sheet(month).totals, incomeActual: 0, savingsActual: -345 },
    });
    const el = await render();
    const card = el.querySelector('[data-tour="month-revenue"]')!;
    expect(card.textContent).toMatch(/0,00/);
    expect(card.textContent).toMatch(/Prévu 2\s?290,00/);
    expect(card.textContent).toContain('achats prévus');
    expect(card.textContent).toContain('Attendu le');
    expect(card.querySelector('button[aria-label="Saisir le montant reçu : Salaire"]')).not.toBeNull();
  });

  it('lien vers les détails du mois', async () => {
    const el = await render();
    const link = el.querySelector('a[data-tour="month-details-link"]')!;
    expect(link.getAttribute('href')).toContain('details');
  });

  it('premier usage : la carte « Pour bien démarrer » propose les trois saisies', async () => {
    current = () => ({ incomes: [], fixed: [], variable: [] });
    const el = await render();
    const start = el.querySelector('[aria-labelledby="mon-start"]');
    expect(start).not.toBeNull();
    expect(start!.querySelectorAll('button').length).toBe(3);
  });

  it('mois futur : pas de saisie du reçu', async () => {
    current = (month) => ({ incomes: [pendingSalary(month)] });
    await TestBed.inject(Router).navigateByUrl('/?mois=2999-01');
    const el = await render();
    expect(el.textContent).toContain('Mois à venir');
    expect(el.querySelector('button[aria-label^="Saisir le montant reçu"]')).toBeNull();
  });
});
