import { DOCUMENT } from '@angular/common';
import { computed, inject, signal } from '@angular/core';
import { TourStep, availableSteps, nextIndex, previousIndex, stepLabel } from './tour-model';

/**
 * Etat commun d'une visite guidee (etapes, etape courante, navigation). Chaque module fournit ses etapes, son
 * demarrage et l'enregistrement de « visite terminee » ; le composant `ff-tour` affiche l'etape courante.
 */
export abstract class TourEngine {
  protected readonly document = inject(DOCUMENT);

  readonly steps = signal<TourStep[]>([]);
  readonly index = signal(0);
  readonly active = signal(false);
  /** Preparation en cours (ouverture de l'ecran, attente du contenu). */
  readonly starting = signal(false);
  readonly current = computed(() => (this.active() ? (this.steps()[this.index()] ?? null) : null));
  readonly progress = computed(() => stepLabel(this.index(), this.steps().length));
  readonly isFirst = computed(() => this.index() === 0);
  readonly isLast = computed(() => nextIndex(this.index(), this.steps().length) === null);

  /** Repere (`data-tour`) du bouton qui relance la visite : il reprend le focus a la fin. */
  protected abstract readonly replayTarget: string;

  /** Enregistre que la visite a ete terminee ou passee (elle ne revient plus d'elle-meme). */
  protected abstract markDone(): Promise<void>;

  next(): void {
    const next = nextIndex(this.index(), this.steps().length);
    if (next === null) this.end();
    else this.index.set(next);
  }

  previous(): void {
    this.index.set(previousIndex(this.index()));
  }

  /** « Passer » et « Terminer » : la visite ne reviendra plus d'elle-meme. */
  skip(): void {
    this.end();
  }

  /** Sortie de l'ecran pendant la visite : interrompue sans etre enregistree. */
  stop(): void {
    this.active.set(false);
  }

  /** Element montre par une etape : le premier affiche qui porte ce repere (un repere peut se repeter). */
  element(target: string | undefined): HTMLElement | null {
    if (!target) return null;
    const all = this.document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
    return Array.from(all).find((el) => el.getClientRects().length > 0) ?? null;
  }

  protected present(target: string): boolean {
    return this.element(target) !== null;
  }

  /** Lance la visite avec les etapes affichables ; faux si aucune ne l'est. */
  protected begin(steps: readonly TourStep[]): boolean {
    const shown = availableSteps(steps, (t) => this.present(t));
    if (!shown.length) return false;
    this.steps.set(shown);
    this.index.set(0);
    this.active.set(true);
    return true;
  }

  private end(): void {
    if (!this.active()) return;
    this.active.set(false);
    // Le focus revient au bouton qui permet de revoir la visite.
    this.element(this.replayTarget)?.focus();
    void this.markDone();
  }

  protected async waitFor(test: () => boolean, timeout: number): Promise<boolean> {
    const until = Date.now() + timeout;
    while (!test()) {
      if (Date.now() > until) return false;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return true;
  }
}
