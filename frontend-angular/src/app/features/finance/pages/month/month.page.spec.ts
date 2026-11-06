import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { FinanceApi } from '../../../../core/api/finance.api';
import { CategoryRef, MonthSheet } from '../../../../core/api/models';
import { FinanceMonthPage } from './month.page';

const housing: CategoryRef = {
  id: 'c1',
  name: 'Logement',
  rootId: 'c1',
  rootName: 'Logement',
  icon: 'house',
  color: null,
};
const groceries: CategoryRef = { ...housing, id: 'c2', name: 'Courses', rootId: 'c2', rootName: 'Courses' };

function sheet(month: string, overrides: Partial<MonthSheet> = {}): MonthSheet {
  return {
    month,
    today: `${month}-05`,
    period: 'CURRENT',
    account: {
      id: 'a1',
      name: 'Compte',
      type: 'CURRENT',
      archived: false,
      position: 0,
      balance: 1234.5,
      hasOperations: true,
    },
    incomes: [
      {
        key: `s1/${month}-28`,
        scheduleId: 's1',
        dueDate: `${month}-28`,
        operationId: 'o1',
        label: 'Salaire',
        category: null,
        incomeKind: 'SALARY',
        date: `${month}-03`,
        planned: 2290,
        actual: 2240,
        difference: -50,
        status: 'DONE',
        comment: 'Absence de deux jours',
        adjusted: false,
        essential: false,
      },
    ],
    fixed: [
      {
        key: `s2/${month}-05`,
        scheduleId: 's2',
        dueDate: `${month}-05`,
        operationId: null,
        label: 'Loyer',
        category: housing,
        incomeKind: null,
        date: `${month}-05`,
        planned: 350,
        actual: null,
        difference: null,
        status: 'PLANNED',
        comment: null,
        adjusted: false,
        essential: true,
      },
    ],
    variable: [
      {
        envelopeId: 'e1',
        label: 'Courses',
        category: groceries,
        cap: 300,
        spent: 345,
        remaining: -45,
        exceeded: true,
        comment: null,
        commentRequired: true,
        operationCount: 6,
      },
    ],
    others: [],
    totals: {
      incomePlanned: 2290,
      incomeActual: 2240,
      fixedPlanned: 350,
      fixedActual: 0,
      variablePlanned: 300,
      variableActual: 345,
      othersActual: 0,
      expensesPlanned: 650,
      expensesActual: 345,
      savingsPlanned: 1640,
      savingsActual: 1895,
    },
    savingsTarget: 300,
    ...overrides,
  };
}

describe('FinanceMonthPage', () => {
  let current: Partial<MonthSheet>;
  let requested: string[];

  beforeEach(() => {
    current = {};
    requested = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: FinanceApi,
          useValue: {
            monthSheet: (month: string) => {
              requested.push(month);
              return of(sheet(month, current));
            },
            alerts: () => of([]),
          },
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

  it('affiche les sections de la feuille avec leurs reperes de visite', async () => {
    const el = await render();
    for (const tour of ['month-nav', 'month-summary', 'month-income', 'month-fixed', 'month-variable', 'month-others']) {
      expect(el.querySelector(`[data-tour="${tour}"]`), tour).not.toBeNull();
    }
    expect(el.textContent).toContain('Salaire');
    expect(el.textContent).toContain('Reçu');
    expect(el.textContent).toContain('Absence de deux jours');
    expect(el.textContent).not.toContain('Pour bien démarrer');
  });

  it('propose de saisir le reel d’une depense fixe et signale le depassement d’un plafond', async () => {
    const el = await render();
    const record = el.querySelector('button[aria-label="Saisir le montant payé : Loyer"]');
    expect(record).not.toBeNull();
    const over = el.querySelector('[data-tour="month-variable"] tr.is-over');
    expect(over).not.toBeNull();
    expect(over!.textContent).toContain('Expliquez le dépassement');
  });

  it('nomme les tableaux et leurs colonnes, sans identifiant en double', async () => {
    const el = await render();
    expect(el.querySelectorAll('table caption').length).toBe(4);
    expect(el.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(10);
    const ids = [...el.querySelectorAll('[id]')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('premier usage : la carte « Pour bien démarrer » propose les trois saisies', async () => {
    current = { incomes: [], fixed: [], variable: [] };
    const el = await render();
    const start = el.querySelector('[aria-labelledby="mon-start"]');
    expect(start).not.toBeNull();
    expect(start!.querySelectorAll('button').length).toBe(3);
  });

  it('mois futur : le reel n’est pas saisissable', async () => {
    await TestBed.inject(Router).navigateByUrl('/?mois=2999-01');
    const el = await render();
    expect(requested).toContain('2999-01');
    expect(el.textContent).toContain('Mois à venir');
    expect(el.querySelector('button[aria-label^="Saisir le montant"]')).toBeNull();
    expect(el.querySelector('button[aria-label^="Ajouter une dépense"]')).toBeNull();
  });
});
