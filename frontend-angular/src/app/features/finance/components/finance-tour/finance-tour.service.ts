import { Dialog } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FinanceApi } from '../../../../core/api/finance.api';
import {
  FINANCE_TOUR_STEPS,
  TourStep,
  availableSteps,
  nextIndex,
  previousIndex,
  stepLabel,
} from './tour-steps';

/** Repere que la feuille du mois affiche une fois chargee : la visite attend qu'il soit la. */
const SHEET_READY = 'month-summary';

/**
 * Visite guidee de « Mes achats » : demarre seule a la premiere visite (preference `tutorialDone` fausse), se relance
 * par le bouton « ? » ou depuis les reglages. Terminee ou passee, elle est enregistree dans les preferences.
 */
@Injectable({ providedIn: 'root' })
export class FinanceTourService {
  private readonly api = inject(FinanceApi);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  private readonly document = inject(DOCUMENT);

  readonly steps = signal<TourStep[]>([]);
  readonly index = signal(0);
  readonly active = signal(false);
  /** Preparation en cours (ouverture de Mon mois, attente de la feuille). */
  readonly starting = signal(false);
  readonly current = computed(() => (this.active() ? (this.steps()[this.index()] ?? null) : null));
  readonly progress = computed(() => stepLabel(this.index(), this.steps().length));
  readonly isFirst = computed(() => this.index() === 0);
  readonly isLast = computed(() => nextIndex(this.index(), this.steps().length) === null);

  /** La preference n'est consultee qu'une fois par session : passer la visite ne la fait pas revenir. */
  private autoChecked = false;

  /** Premiere visite du module (un compte existe) : lance la visite si elle n'a jamais ete terminee ni passee. */
  async autoStart(): Promise<void> {
    if (this.autoChecked) return;
    this.autoChecked = true;
    try {
      const prefs = await firstValueFrom(this.api.preferences());
      if (prefs.tutorialDone) return;
    } catch {
      return;
    }
    // Un dialogue ouvert (saisie du solde de depart, depense) se termine d'abord.
    if (this.dialog.openDialogs.length) await firstValueFrom(this.dialog.afterAllClosed);
    await this.start();
  }

  /** Ouvre « Mon mois », attend la feuille puis montre les etapes dont la cible est presente. */
  async start(): Promise<void> {
    if (this.active() || this.starting()) return;
    this.autoChecked = true;
    this.starting.set(true);
    try {
      // Deja sur Mon mois : le mois affiche (parametres de l'adresse) est conserve.
      if (this.router.url.split(/[?#;]/)[0] !== '/finance/month') {
        const ok = await this.router.navigate(['/finance', 'month']);
        if (!ok) return;
      }
      await this.waitFor(() => this.present(SHEET_READY), 4000);
      // Laisse les sections de la feuille finir leur affichage.
      await new Promise((resolve) => setTimeout(resolve, 150));
      const steps = availableSteps(FINANCE_TOUR_STEPS, (t) => this.present(t));
      if (!steps.length) return;
      this.steps.set(steps);
      this.index.set(0);
      this.active.set(true);
    } finally {
      this.starting.set(false);
    }
  }

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

  /** Sortie du module pendant la visite : interrompue sans etre enregistree. */
  stop(): void {
    this.active.set(false);
  }

  /** Element montre par une etape, s'il est affiche. */
  element(target: string): HTMLElement | null {
    const el = this.document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    return el && el.getClientRects().length > 0 ? el : null;
  }

  private present(target: string): boolean {
    return this.element(target) !== null;
  }

  private end(): void {
    if (!this.active()) return;
    this.active.set(false);
    // Le focus revient au bouton « ? », qui permet de revoir la visite.
    this.element('tour-button')?.focus();
    void this.markDone();
  }

  /** Enregistre `tutorialDone` en conservant les autres preferences (lecture puis ecriture du corps complet). */
  private async markDone(): Promise<void> {
    try {
      const prefs = await firstValueFrom(this.api.preferences());
      if (prefs.tutorialDone) return;
      await firstValueFrom(this.api.updatePreferences({ ...prefs, tutorialDone: true }));
    } catch {
      // Sans enregistrement, la visite sera simplement proposee a nouveau lors d'une prochaine session.
    }
  }

  private async waitFor(test: () => boolean, timeout: number): Promise<boolean> {
    const until = Date.now() + timeout;
    while (!test()) {
      if (Date.now() > until) return false;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return true;
  }
}
