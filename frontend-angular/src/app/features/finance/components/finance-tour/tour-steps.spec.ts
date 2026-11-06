import { describe, expect, it } from 'vitest';
import {
  FINANCE_TOUR_STEPS,
  PHONE_MAX_WIDTH,
  TOP_OFFSET,
  availableSteps,
  nextIndex,
  placeBubble,
  previousIndex,
  scrollTopFor,
  spotBox,
  stepLabel,
} from './tour-steps';

const desktop = { width: 1280, height: 800 };
const phone = { width: 390, height: 844 };
const bubble = { width: 352, height: 200 };

describe('étapes de la visite guidée', () => {
  it('compte entre 8 et 10 étapes, chacune avec une cible, un titre et un texte distincts', () => {
    expect(FINANCE_TOUR_STEPS.length).toBeGreaterThanOrEqual(8);
    expect(FINANCE_TOUR_STEPS.length).toBeLessThanOrEqual(10);
    const targets = FINANCE_TOUR_STEPS.map((s) => s.target);
    expect(new Set(targets).size).toBe(targets.length);
    for (const s of FINANCE_TOUR_STEPS) {
      expect(s.title.trim()).not.toBe('');
      expect(s.text.trim()).not.toBe('');
    }
  });

  it('commence par les onglets et finit par le bouton pour revoir la visite', () => {
    expect(FINANCE_TOUR_STEPS[0].target).toBe('finance-tabs');
    expect(FINANCE_TOUR_STEPS.at(-1)?.target).toBe('tour-button');
  });

  it('couvre chaque repère de la feuille du mois et de l’en-tête', () => {
    const targets = FINANCE_TOUR_STEPS.map((s) => s.target);
    for (const t of [
      'finance-tabs',
      'quick-expense',
      'tour-button',
      'month-nav',
      'month-summary',
      'month-income',
      'month-fixed',
      'month-variable',
      'month-others',
    ]) {
      expect(targets).toContain(t);
    }
  });

  it('saute les étapes dont la cible est absente, dans l’ordre', () => {
    const present = new Set(['finance-tabs', 'month-summary', 'tour-button']);
    const steps = availableSteps(FINANCE_TOUR_STEPS, (t) => present.has(t));
    expect(steps.map((s) => s.target)).toEqual(['finance-tabs', 'month-summary', 'tour-button']);
    expect(availableSteps(FINANCE_TOUR_STEPS, () => false)).toEqual([]);
  });
});

describe('navigation entre les étapes', () => {
  it('formule la progression', () => {
    expect(stepLabel(0, 9)).toBe('Étape 1 sur 9');
    expect(stepLabel(8, 9)).toBe('Étape 9 sur 9');
  });

  it('avance jusqu’à la dernière étape puis termine', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(1, 3)).toBe(2);
    expect(nextIndex(2, 3)).toBeNull();
    expect(nextIndex(0, 1)).toBeNull();
  });

  it('recule sans passer avant la première étape', () => {
    expect(previousIndex(2)).toBe(1);
    expect(previousIndex(0)).toBe(0);
  });
});

describe('position de la bulle', () => {
  it('se place sous la cible quand la place le permet, alignée à gauche', () => {
    const p = placeBubble({ top: 100, left: 200, width: 400, height: 80 }, bubble, desktop);
    expect(p).toEqual({ mode: 'below', top: 192, left: 200 });
  });

  it('passe au-dessus d’une cible proche du bas de l’écran', () => {
    const p = placeBubble({ top: 600, left: 200, width: 400, height: 100 }, bubble, desktop);
    expect(p).toEqual({ mode: 'above', top: 388, left: 200 });
  });

  it('reste dans l’écran à droite comme à gauche', () => {
    expect(placeBubble({ top: 100, left: 1200, width: 60, height: 40 }, bubble, desktop).left).toBe(
      1280 - 352 - 12,
    );
    expect(placeBubble({ top: 100, left: -30, width: 60, height: 40 }, bubble, desktop).left).toBe(
      12,
    );
  });

  it('se pose en bas de l’écran par-dessus une cible trop haute', () => {
    const p = placeBubble({ top: 50, left: 100, width: 800, height: 700 }, bubble, desktop);
    expect(p).toEqual({ mode: 'pinned', top: 800 - 200 - 12, left: 100 });
  });

  it('est centrée sans cible et occupe le bas de l’écran sur téléphone', () => {
    expect(placeBubble(null, bubble, desktop).mode).toBe('center');
    expect(placeBubble({ top: 100, left: 16, width: 358, height: 80 }, bubble, phone).mode).toBe(
      'sheet',
    );
    expect(placeBubble(null, bubble, { width: PHONE_MAX_WIDTH - 1, height: 700 }).mode).toBe(
      'sheet',
    );
  });

  it('élargit la zone mise en valeur d’une marge', () => {
    expect(spotBox({ top: 100, left: 50, width: 200, height: 40 }, 6)).toEqual({
      top: 94,
      left: 44,
      width: 212,
      height: 52,
    });
  });
});

describe('défilement vers la cible', () => {
  it('ne bouge pas quand la cible et sa bulle sont déjà visibles', () => {
    expect(scrollTopFor({ top: 200, left: 0, width: 400, height: 100 }, bubble, desktop, 300)).toBe(
      300,
    );
  });

  it('centre la cible et sa bulle quand la cible est sous l’écran', () => {
    // Cible a 1 000 px sous le haut de l'ecran : bloc cible + bulle de 100 + 12 + 200 = 312 px dans 728 px libres.
    const y = scrollTopFor({ top: 1000, left: 0, width: 400, height: 100 }, bubble, desktop, 0);
    expect(y).toBe(1000 - TOP_OFFSET - (800 - TOP_OFFSET - 312) / 2);
  });

  it('aligne sous la barre supérieure une cible trop haute', () => {
    const y = scrollTopFor({ top: 900, left: 0, width: 400, height: 1200 }, bubble, desktop, 100);
    expect(y).toBe(900 + 100 - TOP_OFFSET);
  });

  it('ne remonte jamais au-dessus du haut de la page', () => {
    expect(scrollTopFor({ top: -40, left: 0, width: 400, height: 40 }, bubble, desktop, 20)).toBe(
      0,
    );
  });

  it('garde la cible au-dessus de la bulle sur téléphone', () => {
    // Bulle de 200 px en bas : la cible de 100 px doit tenir entre 72 et 844 - 224 = 620 px.
    expect(scrollTopFor({ top: 300, left: 0, width: 358, height: 100 }, bubble, phone, 0)).toBe(0);
    const y = scrollTopFor({ top: 700, left: 0, width: 358, height: 100 }, bubble, phone, 0);
    const top = 700 - y;
    expect(top).toBeGreaterThanOrEqual(TOP_OFFSET);
    expect(top + 100).toBeLessThanOrEqual(844 - 224);
  });
});
