import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUADRANT_META, type Settings } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { MatrixTourService } from './matrix-tour.service';
import { EISENHOWER_MATRIX, MATRIX_TOUR_STEPS } from './matrix-tour-steps';

describe('tutoriel de la matrice', () => {
  it('commence par le schéma 2 × 2, aux libellés et couleurs des quadrants', () => {
    const intro = MATRIX_TOUR_STEPS[0];
    expect(intro.target).toBeUndefined();
    expect(intro.diagram).toBe(EISENHOWER_MATRIX);
    expect(EISENHOWER_MATRIX.layout).toBe('matrix');
    expect(EISENHOWER_MATRIX.axes).toEqual({
      columns: ['Urgent', 'Pas urgent'],
      rows: ['Important', 'Pas important'],
    });
    expect(EISENHOWER_MATRIX.stages.map((s) => [s.badge, s.tone, s.title, s.icon])).toEqual(
      (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => [
        q,
        q.toLowerCase(),
        QUADRANT_META[q].label,
        QUADRANT_META[q].icon,
      ]),
    );
  });

  it('met en avant la case « Planifier » et finit sur le bouton de relance', () => {
    const plan = MATRIX_TOUR_STEPS.find((s) => s.diagram && s !== MATRIX_TOUR_STEPS[0]);
    expect(plan?.diagram?.focus).toBe(1);
    expect(MATRIX_TOUR_STEPS.at(-1)?.target).toBe('matrix-tour-button');
    const targets = MATRIX_TOUR_STEPS.flatMap((s) => (s.target ? [s.target] : []));
    expect(new Set(targets).size).toBe(targets.length);
  });
});

describe('MatrixTourService', () => {
  let settings: ReturnType<typeof signal<Partial<Settings>>>;
  let store: {
    settings: typeof settings;
    loaded: ReturnType<typeof signal<boolean>>;
    update: ReturnType<typeof vi.fn>;
  };
  let router: { url: string; navigateByUrl: ReturnType<typeof vi.fn> };
  let tour: MatrixTourService;

  /** Reperes affiches a l'ecran ; jsdom ne calcule pas de mise en page, les elements sont declares visibles. */
  function show(...targets: string[]): HTMLElement[] {
    return targets.map((t) => {
      const el = document.createElement('button');
      el.dataset['tour'] = t;
      document.body.append(el);
      return el;
    });
  }

  beforeEach(() => {
    settings = signal<Partial<Settings>>({ matrixTutorialDone: false, notesTutorialDone: true });
    store = {
      settings,
      loaded: signal(true),
      update: vi.fn(async (patch: Partial<Settings>) =>
        settings.update((s) => ({ ...s, ...patch })),
      ),
    };
    router = { url: '/matrix', navigateByUrl: vi.fn(async () => true) };
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (
      this: HTMLElement,
    ) {
      // Un element marque « cache » n'est pas affiche (onglets sur grand ecran, case inactive).
      return (this.hidden ? [] : [{}]) as unknown as DOMRectList;
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsStore, useValue: store },
        { provide: Router, useValue: router },
      ],
    });
    tour = TestBed.inject(MatrixTourService);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('démarre seule à la première visite, sans les étapes dont la cible est cachée', async () => {
    const [tabs] = show('matrix-tabs', 'matrix-new-task', 'matrix-grid', 'matrix-tour-button');
    tabs.hidden = true;
    await tour.autoStart();
    expect(tour.active()).toBe(true);
    expect(tour.current()?.diagram).toBe(EISENHOWER_MATRIX);
    expect(tour.steps().map((s) => s.target ?? 'schéma')).toEqual([
      'schéma',
      'matrix-new-task',
      'matrix-grid',
      'schéma',
      'matrix-tour-button',
    ]);
  });

  it('montre la première carte affichée quand le repère se répète', async () => {
    const [hidden, visible] = show('matrix-task', 'matrix-task');
    hidden.hidden = true;
    expect(tour.element('matrix-task')).toBe(visible);
  });

  it('ne dépend pas du tutoriel des notes et enregistre son propre paramètre', async () => {
    show('matrix-new-task', 'matrix-grid', 'matrix-tour-button');
    await tour.autoStart();
    tour.skip();
    await vi.waitFor(() => expect(store.update).toHaveBeenCalledWith({ matrixTutorialDone: true }));
    expect(document.activeElement?.getAttribute('data-tour')).toBe('matrix-tour-button');
  });

  it('ne démarre pas seule une fois terminé ; « Comment ça marche ? » ouvre la matrice', async () => {
    settings.set({ matrixTutorialDone: true });
    router.url = '/';
    show('matrix-new-task', 'matrix-grid');
    await tour.autoStart();
    expect(tour.active()).toBe(false);
    await tour.start();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/matrix');
    expect(tour.active()).toBe(true);
  });
});
