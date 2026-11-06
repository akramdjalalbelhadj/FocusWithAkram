import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { NotesTourService } from './notes-tour.service';
import { IDEA_FLOW, NOTES_TOUR_STEPS } from './notes-tour-steps';

describe('tutoriel de Notes & idées', () => {
  it('commence par le schéma du parcours : nouvelle idée, brainstorming, transformation en tâches', () => {
    const intro = NOTES_TOUR_STEPS[0];
    expect(intro.target).toBeUndefined();
    expect(intro.diagram).toBe(IDEA_FLOW);
    expect(IDEA_FLOW.stages.map((s) => [s.title, s.text])).toEqual([
      ['Nouvelle idée', 'Capturer une pensée spontanée'],
      ['Brainstorming', 'Développer, enrichir et organiser l’idée'],
      ['Transformation en tâches', 'Créer une ou plusieurs actions réalisables'],
    ]);
    // Trois couleurs distinctes, une par etape.
    expect(new Set(IDEA_FLOW.stages.map((s) => s.tone)).size).toBe(3);
  });

  it('montre chaque étape du parcours, met la transformation en avant et finit sur le bouton de relance', () => {
    const titles = NOTES_TOUR_STEPS.map((s) => s.title);
    expect(titles.findIndex((t) => t.startsWith('1.'))).toBeLessThan(
      titles.findIndex((t) => t.startsWith('2.')),
    );
    const tasks = NOTES_TOUR_STEPS.find((s) => s.title.startsWith('3.'));
    expect(tasks?.diagram?.focus).toBe(2);
    expect(NOTES_TOUR_STEPS.at(-1)?.target).toBe('notes-tour-button');
    const targets = NOTES_TOUR_STEPS.flatMap((s) => (s.target ? [s.target] : []));
    expect(new Set(targets).size).toBe(targets.length);
  });
});

describe('NotesTourService', () => {
  let settings: ReturnType<typeof signal<Partial<Settings>>>;
  let store: {
    settings: typeof settings;
    loaded: ReturnType<typeof signal<boolean>>;
    update: ReturnType<typeof vi.fn>;
  };
  let router: { url: string; navigateByUrl: ReturnType<typeof vi.fn> };
  let tour: NotesTourService;

  /** Reperes affiches a l'ecran ; jsdom ne calcule pas de mise en page, les elements sont declares visibles. */
  function show(...targets: string[]): void {
    for (const t of targets) {
      const el = document.createElement('button');
      el.dataset['tour'] = t;
      document.body.append(el);
    }
  }

  beforeEach(() => {
    settings = signal<Partial<Settings>>({ theme: 'SYSTEM', notesTutorialDone: false });
    store = {
      settings,
      loaded: signal(true),
      update: vi.fn(async (patch: Partial<Settings>) =>
        settings.update((s) => ({ ...s, ...patch })),
      ),
    };
    router = { url: '/notes', navigateByUrl: vi.fn(async () => true) };
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      {},
    ] as unknown as DOMRectList);
    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsStore, useValue: store },
        { provide: Router, useValue: router },
      ],
    });
    tour = TestBed.inject(NotesTourService);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('démarre seule à la première visite, schéma en premier, sans les étapes absentes', async () => {
    show('notes-capture', 'notes-list', 'notes-tour-button');
    await tour.autoStart();
    expect(tour.active()).toBe(true);
    expect(tour.current()?.diagram).toBe(IDEA_FLOW);
    expect(tour.steps().map((s) => s.target ?? 'schéma')).toEqual([
      'schéma',
      'notes-capture',
      'notes-list',
      'schéma',
      'notes-tour-button',
    ]);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('ne démarre pas seule une fois terminé, ni si les paramètres sont inconnus', async () => {
    show('notes-capture', 'notes-list');
    settings.set({ notesTutorialDone: true });
    await tour.autoStart();
    expect(tour.active()).toBe(false);

    const other = TestBed.runInInjectionContext(() => new NotesTourService());
    settings.set({});
    await other.autoStart();
    expect(other.active()).toBe(false);
  });

  it('n’ouvre pas la liste de force si l’utilisateur l’a quittée avant le démarrage', async () => {
    router.url = '/matrix';
    await tour.autoStart();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(tour.active()).toBe(false);
  });

  it('« Comment ça marche ? » ouvre la liste puis enregistre la fin dans les paramètres', async () => {
    router.url = '/notes/abc';
    show('notes-capture', 'notes-list', 'notes-tour-button');
    await tour.start();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/notes');
    while (!tour.isLast()) tour.next();
    tour.next();
    expect(tour.active()).toBe(false);
    await vi.waitFor(() => expect(store.update).toHaveBeenCalledWith({ notesTutorialDone: true }));
    expect(document.activeElement?.getAttribute('data-tour')).toBe('notes-tour-button');
  });

  it('« Passer » l’enregistre aussi ; il ne revient plus dans la session', async () => {
    show('notes-capture', 'notes-list');
    await tour.autoStart();
    tour.skip();
    await vi.waitFor(() => expect(store.update).toHaveBeenCalledTimes(1));
    await tour.autoStart();
    expect(tour.active()).toBe(false);
  });
});
