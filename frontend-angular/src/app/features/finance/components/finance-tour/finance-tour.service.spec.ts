import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceApi } from '../../../../core/api/finance.api';
import type { FinancePreferences } from '../../../../core/api/models';
import { FinanceTourService } from './finance-tour.service';

const PREFS: FinancePreferences = {
  safetyReserve: 300,
  savingsFloor: 0,
  defaultVariableCap: 500,
  defaultSavingsTarget: 200,
  warningPercent: 80,
  tutorialDone: false,
};

describe('FinanceTourService', () => {
  let prefs: FinancePreferences;
  let api: { preferences: ReturnType<typeof vi.fn>; updatePreferences: ReturnType<typeof vi.fn> };
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };
  let tour: FinanceTourService;

  /** Reperes affiches a l'ecran ; jsdom ne calcule pas de mise en page, les elements sont declares visibles. */
  function show(...targets: string[]): void {
    for (const t of targets) {
      const el = document.createElement('button');
      el.dataset['tour'] = t;
      document.body.append(el);
    }
  }

  beforeEach(() => {
    prefs = { ...PREFS };
    api = {
      preferences: vi.fn(() => of(prefs)),
      updatePreferences: vi.fn((body: FinancePreferences) => of(body)),
    };
    router = { url: '/finance/month', navigate: vi.fn(async () => true) };
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      {},
    ] as unknown as DOMRectList);
    TestBed.configureTestingModule({
      providers: [
        { provide: FinanceApi, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
    tour = TestBed.inject(FinanceTourService);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('démarre seule à la première visite avec les seules étapes présentes', async () => {
    show('finance-tabs', 'month-summary', 'quick-expense', 'tour-button');
    await tour.autoStart();
    expect(tour.active()).toBe(true);
    expect(tour.steps().map((s) => s.target)).toEqual([
      'finance-tabs',
      'month-summary',
      'quick-expense',
      'tour-button',
    ]);
    expect(tour.progress()).toBe('Étape 1 sur 4');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ne démarre pas seule une fois la visite terminée ou passée', async () => {
    prefs.tutorialDone = true;
    show('finance-tabs', 'month-summary');
    await tour.autoStart();
    expect(tour.active()).toBe(false);
  });

  it('ouvre Mon mois avant de commencer depuis un autre onglet', async () => {
    router.url = '/finance/settings';
    show('finance-tabs', 'month-summary');
    await tour.start();
    expect(router.navigate).toHaveBeenCalledWith(['/finance', 'month']);
    expect(tour.active()).toBe(true);
  });

  it('avance, recule, puis enregistre la fin en gardant les autres préférences', async () => {
    show('finance-tabs', 'month-summary', 'tour-button');
    await tour.start();
    tour.previous();
    expect(tour.index()).toBe(0);
    tour.next();
    tour.next();
    expect(tour.isLast()).toBe(true);
    tour.next();
    expect(tour.active()).toBe(false);
    await vi.waitFor(() => expect(api.updatePreferences).toHaveBeenCalledTimes(1));
    expect(api.updatePreferences).toHaveBeenCalledWith({ ...PREFS, tutorialDone: true });
    expect(document.activeElement?.getAttribute('data-tour')).toBe('tour-button');
  });

  it('« Passer » enregistre aussi la visite, qui ne revient plus dans la session', async () => {
    show('finance-tabs', 'month-summary');
    await tour.autoStart();
    tour.skip();
    expect(tour.active()).toBe(false);
    await vi.waitFor(() =>
      expect(api.updatePreferences).toHaveBeenCalledWith({ ...PREFS, tutorialDone: true }),
    );
    await tour.autoStart();
    expect(tour.active()).toBe(false);
  });

  it('une sortie du module interrompt la visite sans l’enregistrer', async () => {
    show('finance-tabs', 'month-summary');
    await tour.start();
    tour.stop();
    expect(tour.active()).toBe(false);
    expect(api.updatePreferences).not.toHaveBeenCalled();
  });
});
