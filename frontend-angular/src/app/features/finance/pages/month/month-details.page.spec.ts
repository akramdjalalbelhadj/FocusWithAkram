import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { FinanceApi } from '../../../../core/api/finance.api';
import { FinanceMonthDetailsPage } from './month-details.page';
import { sheet } from './month-sheet.fixture';

describe('FinanceMonthDetailsPage', () => {
  let requested: string[];

  beforeEach(() => {
    requested = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: FinanceApi,
          useValue: {
            monthSheet: (month: string) => {
              requested.push(month);
              return of(sheet(month));
            },
          },
        },
      ],
    });
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(FinanceMonthDetailsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche les sections de la feuille', async () => {
    const el = await render();
    for (const tour of ['month-nav', 'month-income', 'month-fixed', 'month-variable', 'month-others']) {
      expect(el.querySelector(`[data-tour="${tour}"]`), tour).not.toBeNull();
    }
    expect(el.textContent).toContain('Salaire');
    expect(el.textContent).toContain('Reçu');
    expect(el.textContent).toContain('Absence de deux jours');
  });

  it('revenus sans colonne Écart ; dépenses fixes avec leur écart', async () => {
    const el = await render();
    const heads = (tour: string) =>
      [...el.querySelectorAll(`[data-tour="${tour}"] thead th`)].map((t) => t.textContent?.trim() ?? '');
    expect(heads('month-income').some((h) => h.startsWith('Écart'))).toBe(false);
    expect(heads('month-fixed').some((h) => h.startsWith('Écart'))).toBe(true);
    expect(el.querySelector('[data-tour="month-income"] .c-diff')).toBeNull();
  });

  it('épargne : seulement le réel, sans épargne prévue', async () => {
    const el = await render();
    const savings = el.querySelector('[aria-labelledby="mon-savings"]')!;
    expect(savings.querySelectorAll('thead th').length).toBe(2);
    expect(savings.textContent).not.toContain('Prévu');
    expect(savings.textContent).toMatch(/1\s?895,00/);
  });

  it('propose de saisir le reel d’une depense fixe et signale le depassement d’un plafond', async () => {
    const el = await render();
    expect(el.querySelector('button[aria-label="Saisir le montant payé : Loyer"]')).not.toBeNull();
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

  it('mois futur : le reel n’est pas saisissable', async () => {
    await TestBed.inject(Router).navigateByUrl('/?mois=2999-01');
    const el = await render();
    expect(requested).toContain('2999-01');
    expect(el.textContent).toContain('Mois à venir');
    expect(el.querySelector('button[aria-label^="Saisir le montant"]')).toBeNull();
    expect(el.querySelector('button[aria-label^="Ajouter une dépense"]')).toBeNull();
  });
});
